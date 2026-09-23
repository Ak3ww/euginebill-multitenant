/**
 * HSGQ OLT SNMP/Telnet/SSH Integration
 * Supports:
 *   - HSGQ-G02ID (2-Port GPON Mini OLT)
 *   - HSGQ-G008 / HSGQ-G016 (8/16-Port GPON)
 *   - HSGQ-E04 / HSGQ-E08 (4/8-Port EPON)
 */

import { SNMPConfig, snmpGet, snmpWalk } from '../snmp';
import { TelnetConfig, executeCommand } from '../telnet';
import { SSHConfig, executeCommand as sshExecute, executeCommandsInShell } from '../ssh';

// HSGQ Enterprise MIB root: 1.3.6.1.4.1.50222
const HSGQ_OIDS = {
  temperature: '1.3.6.1.4.1.50222.2.1.1.1.0',
  cpuUsage:    '1.3.6.1.4.1.50222.2.1.1.2.0',
  memoryUsage: '1.3.6.1.4.1.50222.2.1.1.3.0',
  // Host resources fallback
  hostCpu:     '1.3.6.1.2.1.25.3.3.1.2.1',
  hostMemTotal:'1.3.6.1.2.1.25.2.3.1.5.1',
  hostMemUsed: '1.3.6.1.2.1.25.2.3.1.6.1',
};

export async function getTemperature(config: SNMPConfig): Promise<number | null> {
  const result = await snmpGet(config, HSGQ_OIDS.temperature);
  if (result.success && result.value) {
    const val = parseFloat(result.value);
    if (val > 150) return val / 10;
    if (val > 1000) return val / 100;
    return val;
  }
  return null;
}

export async function getCpuUsage(config: SNMPConfig): Promise<number | null> {
  let result = await snmpGet(config, HSGQ_OIDS.cpuUsage);
  if (!result.success || !result.value) {
    result = await snmpGet(config, HSGQ_OIDS.hostCpu);
  }
  if (result.success && result.value) {
    const val = parseInt(result.value);
    if (!isNaN(val) && val >= 0 && val <= 100) return val;
  }
  return null;
}

export async function getMemoryUsage(config: SNMPConfig): Promise<number | null> {
  const result = await snmpGet(config, HSGQ_OIDS.memoryUsage);
  if (result.success && result.value) {
    const val = parseInt(result.value);
    if (!isNaN(val) && val >= 0 && val <= 100) return val;
  }

  // Fallback: calculate from HOST-RESOURCES-MIB
  try {
    const [totRes, usedRes] = await Promise.all([
      snmpGet(config, HSGQ_OIDS.hostMemTotal),
      snmpGet(config, HSGQ_OIDS.hostMemUsed),
    ]);
    if (totRes.success && usedRes.success && totRes.value && usedRes.value) {
      const tot = parseInt(totRes.value);
      const used = parseInt(usedRes.value);
      if (tot > 0) return Math.round((used / tot) * 100);
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * Parses HSGQ table outputs from CLI commands.
 * Examples:
 *   Port  ONU ID  Serial-Number    Status     Distance(m)  Rx-Power(dBm)
 *   1     1       ZTEGC3200001     online     245          -21.30
 *   2     1       HWTC8899AABB     offline    0            -
 *   1/1:1         SKYW12345678     online     150          -18.45
 */
function parseHsgqOnuOutput(output: string, defaultPort: number = 1): any[] {
  const onus: any[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('-') || /^(port|onu|index|pon)/i.test(trimmed)) {
      continue;
    }

    // Pattern 1: Multi-column: Port, ONU-ID, SN/MAC, Status, [Distance], [RxPower], [Description]
    // e.g.: 1   1   ZTEGC3200001   online   245   -21.30   Pak-Budi
    const matchCols = trimmed.match(/^(\d+)\s+(\d+)\s+([0-9a-zA-Z]{8,16})\s+(\S+)(?:\s+([-\d.]+|n\/a))?(?:\s+([-\d.]+|n\/a))?(?:\s+(.+))?/i);
    if (matchCols) {
      const [, portStr, onuIdStr, sn, statusStr, distStr, rxStr, descStr] = matchCols;
      const port = parseInt(portStr) || defaultPort;
      const onuId = parseInt(onuIdStr);
      const status = normalizeStatus(statusStr);
      const distance = distStr && distStr !== '-' && distStr.toLowerCase() !== 'n/a' ? parseInt(distStr) : undefined;
      const rxPower = rxStr && rxStr !== '-' && rxStr.toLowerCase() !== 'n/a' ? parseFloat(rxStr) : undefined;
      const description = descStr?.trim() || undefined;

      onus.push({ frame: 0, slot: 0, port, onuId, serialNumber: sn.toUpperCase(), status, distance, rxPower, description });
      continue;
    }

    // Pattern 2: Index format: "1/1:1" or "1:1"
    const matchIndex = trimmed.match(/^(?:1\/)?(\d+)[:/](\d+)\s+([0-9a-zA-Z]{8,16})\s+(\S+)(?:\s+([\d.]+m?))?(?:\s+([-\d.]+))?(?:\s+(.+))?/i);
    if (matchIndex) {
      const [, portStr, onuIdStr, sn, statusStr, distStr, rxStr, descStr] = matchIndex;
      const port = parseInt(portStr) || defaultPort;
      const onuId = parseInt(onuIdStr);
      const status = normalizeStatus(statusStr);
      const distance = distStr ? parseInt(distStr.replace(/m/i, '')) : undefined;
      const rxPower = rxStr && rxStr !== '-' ? parseFloat(rxStr) : undefined;
      const description = descStr?.trim() || undefined;

      onus.push({ frame: 0, slot: 0, port, onuId, serialNumber: sn.toUpperCase(), status, distance, rxPower, description });
      continue;
    }

    // Pattern 3: Simple ONU ID + SN + Status + [Description] (when inside per-port command)
    const matchSimple = trimmed.match(/^(\d+)\s+([0-9a-zA-Z]{8,16})\s+(\S+)(?:\s+(.+))?/i);
    if (matchSimple) {
      const [, onuIdStr, sn, statusStr, descStr] = matchSimple;
      onus.push({
        frame: 0,
        slot: 0,
        port: defaultPort,
        onuId: parseInt(onuIdStr),
        serialNumber: sn.toUpperCase(),
        status: normalizeStatus(statusStr),
        description: descStr?.trim() || undefined,
      });
    }
  }

  return onus;
}

function normalizeStatus(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (['online', 'active', 'working', 'up', 'enable', 'registered'].includes(s)) return 'online';
  if (['dying-gasp', 'dying_gasp', 'pwr_off', 'power-off', 'dyinggasp'].includes(s)) return 'dying_gasp';
  if (['los', 'link-down', 'wire-down', 'losi', 'lofi'].includes(s)) return 'los';
  if (['auth-failed', 'unregistered', 'unauth', 'unconfig'].includes(s)) return 'auth_failed';
  return 'offline';
}

export async function discoverONUs(config: TelnetConfig): Promise<any[]> {
  const onusMap = new Map<string, any>();

  const addOnus = (list: any[]) => {
    for (const item of list) {
      const key = `${item.port}:${item.onuId}`;
      if (!onusMap.has(key)) {
        onusMap.set(key, item);
      }
    }
  };

  await executeCommand(config, 'terminal length 0').catch(() => {});

  const globalCmds = [
    'show gpon onu information',
    'show gpon onu state',
    'show onu status',
    'show epon onu state',
  ];

  for (const cmd of globalCmds) {
    const res = await executeCommand(config, cmd);
    if (res.success && res.output && res.output.length > 30) {
      addOnus(parseHsgqOnuOutput(res.output));
    }
  }

  for (let port = 1; port <= 16; port++) {
    const res = await executeCommand(config, `show gpon onu state ${port}`);
    if (res.success && res.output && !res.output.includes('Invalid') && !res.output.includes('error')) {
      addOnus(parseHsgqOnuOutput(res.output, port));
    }
    const res2 = await executeCommand(config, `show gpon onu information ${port}`);
    if (res2.success && res2.output && !res2.output.includes('Invalid') && !res2.output.includes('error')) {
      addOnus(parseHsgqOnuOutput(res2.output, port));
    }
  }

  return Array.from(onusMap.values());
}

export async function discoverONUsSSH(config: SSHConfig): Promise<any[]> {
  const onusMap = new Map<string, any>();

  const addOnus = (list: any[]) => {
    for (const item of list) {
      const key = `${item.port}:${item.onuId}`;
      if (!onusMap.has(key)) {
        onusMap.set(key, item);
      }
    }
  };

  const cmds = [
    'terminal length 0',
    'show gpon onu information',
    'show gpon onu state',
    'show gpon onu state 1',
    'show gpon onu state 2',
    'show gpon onu state 3',
    'show gpon onu state 4',
  ];

  const res = await executeCommandsInShell(config, cmds);
  if (res.success && res.output && res.output.length > 30) {
    addOnus(parseHsgqOnuOutput(res.output));
  } else {
    for (const cmd of ['show gpon onu information', 'show gpon onu state 1', 'show gpon onu state 2']) {
      const singleRes = await sshExecute({ ...config, timeout: 5000 }, cmd);
      if (singleRes.success && singleRes.output && singleRes.output.length > 30) {
        addOnus(parseHsgqOnuOutput(singleRes.output));
      }
    }
  }

  return Array.from(onusMap.values());
}

function parseOpticalOutput(output: string): any {
  const info: any = {};
  const rxMatch = output.match(/rx.*?(?:power|\(dbm\))[:\s]+([-\d.]+)/i)
    || output.match(/receive.*?(?:power|\(dbm\))[:\s]+([-\d.]+)/i)
    || output.match(/rx-power[:\s]+([-\d.]+)/i);
  if (rxMatch) info.rxPower = parseFloat(rxMatch[1]);

  const txMatch = output.match(/tx.*?(?:power|\(dbm\))[:\s]+([-\d.]+)/i)
    || output.match(/transmit.*?(?:power|\(dbm\))[:\s]+([-\d.]+)/i)
    || output.match(/tx-power[:\s]+([-\d.]+)/i);
  if (txMatch) info.txPower = parseFloat(txMatch[1]);

  const distMatch = output.match(/distance[:\s]+([-\d.]+)/i);
  if (distMatch) info.distance = Math.round(parseFloat(distMatch[1]));

  const tempMatch = output.match(/temp(?:erature)?[:\s]+([-\d.]+)/i);
  if (tempMatch) info.temperature = parseFloat(tempMatch[1]);

  const voltMatch = output.match(/volt(?:age)?[:\s]+([-\d.]+)/i);
  if (voltMatch) info.voltage = parseFloat(voltMatch[1]);

  return Object.keys(info).length > 0 ? info : null;
}

export async function getOnuOpticalInfo(
  config: TelnetConfig,
  _frame: number,
  _slot: number,
  port: number,
  onuId: number
): Promise<any> {
  const commands = [
    `show gpon onu optical-info ${port} ${onuId}`,
    `show pon power onu-rx ${port}`,
    `show gpon optical-info ${port} ${onuId}`,
  ];

  for (const cmd of commands) {
    const result = await executeCommand(config, cmd);
    if (result.success && result.output) {
      const parsed = parseOpticalOutput(result.output);
      if (parsed) return parsed;
    }
  }

  return null;
}

export async function getOnuOpticalInfoSSH(
  config: SSHConfig,
  _frame: number,
  _slot: number,
  port: number,
  onuId: number
): Promise<any> {
  const commands = [
    `show gpon onu optical-info ${port} ${onuId}`,
    `show gpon optical-info ${port} ${onuId}`,
  ];

  for (const cmd of commands) {
    const result = await sshExecute(config, cmd);
    if (result.success && result.output) {
      const parsed = parseOpticalOutput(result.output);
      if (parsed) return parsed;
    }
  }

  return null;
}

export async function getTrafficStats(_config: SNMPConfig): Promise<{ rxBytes?: bigint; txBytes?: bigint }> {
  return {};
}

/**
 * Native SNMP ONU discovery for HSGQ OLTs (Proven OIDs from BotRedaman)
 * Walks:
 *   - Name:   1.3.6.1.4.1.50224.3.12.2.1.2 (Customer description)
 *   - Rx:     1.3.6.1.4.1.50224.3.12.3.1.4 (scale 100)
 *   - Tx:     1.3.6.1.4.1.50224.3.12.3.1.3 (scale 100)
 *   - Status: 1.3.6.1.4.1.50224.3.12.2.1.3
 *   - SN:     1.3.6.1.4.1.50224.3.12.2.1.15
 */
export async function discoverONUsSNMP(
  config: SNMPConfig,
  _firmwareVersion?: string | null,
  _telnetConfig?: TelnetConfig | null
): Promise<any[]> {
  const cfg = {
    ...config,
    version: '1' as const, // HSGQ uses SNMPv1
  };

  const [nameRes, rxRes, txRes, snRes, statusRes] = await Promise.all([
    snmpWalk(cfg, '1.3.6.1.4.1.50224.3.12.2.1.2'),   // Name/Description
    snmpWalk(cfg, '1.3.6.1.4.1.50224.3.12.3.1.4'),   // Rx Power
    snmpWalk(cfg, '1.3.6.1.4.1.50224.3.12.3.1.3'),   // Tx Power
    snmpWalk(cfg, '1.3.6.1.4.1.50224.3.12.2.1.15'),  // Serial Number
    snmpWalk(cfg, '1.3.6.1.4.1.50224.3.12.2.1.3'),   // Status
  ]);

  const names = nameRes.results || {};
  const rxMap = rxRes.results || {};
  const txMap = txRes.results || {};
  const snMap = snRes.results || {};
  const statusMap = statusRes.results || {};

  // Helper to extract HSGQ index from OID (handles .0.0 suffix on optical OIDs)
  const getHsgqIdx = (oid: string): string => {
    const parts = oid.split('.');
    if (parts.length >= 3 && parts[parts.length - 2] === '0' && parts[parts.length - 1] === '0') {
      return parts[parts.length - 3];
    }
    return parts[parts.length - 1];
  };

  // Build index -> SN map (filtering out empty/zero phantom SNs)
  const snByIdx = new Map<string, string>();
  for (const [oid, val] of Object.entries(snMap)) {
    const idx = getHsgqIdx(oid);
    const sn = val.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    if (sn && sn.length >= 6 && !/^0+$/.test(sn)) {
      snByIdx.set(idx, sn);
    }
  }

  // Name / Description
  const nameByIdx = new Map<string, string>();
  for (const [oid, val] of Object.entries(names)) {
    const idx = getHsgqIdx(oid);
    if (val.trim()) nameByIdx.set(idx, val.trim());
  }

  // Rx Power (scale 100: -2600 -> -26.0)
  const rxByIdx = new Map<string, number>();
  for (const [oid, val] of Object.entries(rxMap)) {
    const idx = getHsgqIdx(oid);
    const raw = parseFloat(val);
    if (!isNaN(raw)) {
      const scaled = raw > 0 || raw < -100 ? raw / 100.0 : raw;
      if (scaled >= -40 && scaled <= -5) rxByIdx.set(idx, parseFloat(scaled.toFixed(2)));
    }
  }

  // Tx Power (scale 100)
  const txByIdx = new Map<string, number>();
  for (const [oid, val] of Object.entries(txMap)) {
    const idx = getHsgqIdx(oid);
    const raw = parseFloat(val);
    if (!isNaN(raw)) {
      const scaled = raw > 50 || raw < -50 ? raw / 100.0 : raw;
      if (scaled >= -10 && scaled <= 10) txByIdx.set(idx, parseFloat(scaled.toFixed(2)));
    }
  }

  // Status
  const statusByIdx = new Map<string, string>();
  for (const [oid, val] of Object.entries(statusMap)) {
    const idx = getHsgqIdx(oid);
    statusByIdx.set(idx, val);
  }

  const onus: any[] = [];
  // Loop strictly over registered SNs (1:1 with BotRedaman)
  for (const [idxStr, sn] of Array.from(snByIdx.entries())) {
    const onuIdx = parseInt(idxStr) || 1;
    const description = nameByIdx.get(idxStr) || null;
    const rxPower = rxByIdx.get(idxStr) ?? null;
    const txPower = txByIdx.get(idxStr) ?? null;
    const rawStatusVal = statusByIdx.get(idxStr);

    // HSGQ status OID .3 is a REGISTRATION flag — returns '1' for ALL 190 registered ONTs,
    // even offline ones. It does NOT distinguish online vs offline.
    // BotRedaman uses hysteresis (historical state) for offline detection.
    // For single-shot polling without history: rx power is the only reliable indicator.
    //   - rxPower present  → OLT is actively reporting signal → online
    //   - rxPower null     → OLT returning no optical data    → offline
    // Exception: if status OID explicitly returns a non-'1' value, honour it as offline.
    let status: string;
    if (rawStatusVal !== undefined && rawStatusVal !== '1') {
      status = 'offline'; // Explicit non-online state from OLT
    } else if (rxPower !== null) {
      status = 'online';  // Active optical signal = online
    } else {
      status = 'offline'; // No rx power = offline (BotRedaman fallback: no history → offline)
    }

    onus.push({
      frame: 0,
      slot: 0,
      port: 1,
      onuId: onuIdx,
      serialNumber: sn,
      description,
      status,
      rxPower,
      txPower,
    });
  }

  return onus;
}
