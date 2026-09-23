/**
 * VSOL OLT SNMP/Telnet/SSH Integration
 * Supports:
 *   - V1600GS (1-Port GPON, Cortina)
 *   - V1600GS-ZF (1-Port GPON, ZTE Falcon Chipset)
 *   - V1600GT (4/8/16-Port GPON)
 *   - V1600G1 / V1600G2 (4/8 Port GPON)
 *   - V1600D series (EPON)
 */

import { SNMPConfig, snmpGet, snmpWalk } from '../snmp';
import { TelnetConfig, executeCommand } from '../telnet';
import { SSHConfig, executeCommand as sshExecute, executeCommandsInShell } from '../ssh';

// VSOL Enterprise MIB root: 1.3.6.1.4.1.37950
const VSOL_OIDS = {
  temperature: '1.3.6.1.4.1.37950.1.1.5.1.1.2.0',
  cpuUsage:    '1.3.6.1.4.1.37950.1.1.5.1.1.3.0',
  memoryUsage: '1.3.6.1.4.1.37950.1.1.5.1.1.4.0',
  // Fallbacks using standard HOST-RESOURCES-MIB
  hostCpu:     '1.3.6.1.2.1.25.3.3.1.2.1',
  hostMemTotal:'1.3.6.1.2.1.25.2.3.1.5.1',
  hostMemUsed: '1.3.6.1.2.1.25.2.3.1.6.1',
};

export async function getTemperature(config: SNMPConfig): Promise<number | null> {
  const result = await snmpGet(config, VSOL_OIDS.temperature);
  if (result.success && result.value) {
    const val = parseFloat(result.value);
    // Some firmwares return value multiplied by 10 or 100 (e.g. 450 = 45.0 C)
    if (val > 150) return val / 10;
    if (val > 1000) return val / 100;
    return val;
  }
  return null;
}

export async function getCpuUsage(config: SNMPConfig): Promise<number | null> {
  let result = await snmpGet(config, VSOL_OIDS.cpuUsage);
  if (!result.success || !result.value) {
    result = await snmpGet(config, VSOL_OIDS.hostCpu);
  }
  if (result.success && result.value) {
    const val = parseInt(result.value);
    if (!isNaN(val) && val >= 0 && val <= 100) return val;
  }
  return null;
}

export async function getMemoryUsage(config: SNMPConfig): Promise<number | null> {
  const result = await snmpGet(config, VSOL_OIDS.memoryUsage);
  if (result.success && result.value) {
    const val = parseInt(result.value);
    if (!isNaN(val) && val >= 0 && val <= 100) return val;
  }

  // Fallback: calculate from HOST-RESOURCES-MIB
  try {
    const [totRes, usedRes] = await Promise.all([
      snmpGet(config, VSOL_OIDS.hostMemTotal),
      snmpGet(config, VSOL_OIDS.hostMemUsed),
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
 * Parses VSOL table outputs from CLI commands.
 * Handles:
 * - "show ont status" / "show gpon onu state"
 * - "show ont info" / "show interface gpon 0/x onu"
 *
 * Example patterns:
 * 0/1    1   ZTEGD4A3C19B   Online    320   -19.45
 * 1      1   HWTC12345678   online    150   -21.20
 * 0/1:1      ZTEGD4A3C19B   working   320   -19.45
 */
function parseVsolOnuOutput(output: string, defaultPort: number = 1): any[] {
  const onus: any[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('-') || /^(port|onu|index|pon)/i.test(trimmed)) {
      continue;
    }

    // Pattern 1: Port format "0/1:1" or "0/2:3" or "1:3"
    // e.g.: 0/1:1  ZTEGD4A3C19B  Online  320m  -19.45dBm  [Description/Name]
    const matchSlashColon = trimmed.match(/^(?:0\/)?(\d+)[:/](\d+)\s+([0-9a-zA-Z]{8,16})\s+(\S+)(?:\s+([\d.]+m?))?(?:\s+([-\d.]+))?(?:\s+(.+))?/i);
    if (matchSlashColon) {
      const [, portStr, onuIdStr, sn, statusStr, distStr, rxStr, descStr] = matchSlashColon;
      const port = parseInt(portStr) || defaultPort;
      const onuId = parseInt(onuIdStr);
      const status = normalizeStatus(statusStr);
      const distance = distStr ? parseInt(distStr.replace(/m/i, '')) : undefined;
      const rxPower = rxStr && rxStr !== '-' ? parseFloat(rxStr) : undefined;
      const description = descStr?.trim() || undefined;

      onus.push({ frame: 0, slot: 0, port, onuId, serialNumber: sn.toUpperCase(), status, distance, rxPower, description });
      continue;
    }

    // Pattern 2: Columns: Port (or 0/1), ONT-ID, SerialNumber, Status, [Distance], [RxPower], [Description]
    // e.g.: 0/1   1   ZTEGD4A3C19B   Online   320   -19.45   Pak-Budi
    // e.g.: 1     2   HWTC12345678   Offline  -     -        Amar
    const matchCols = trimmed.match(/^(?:0\/)?(\d+)\s+(\d+)\s+([0-9a-zA-Z]{8,16})\s+(\S+)(?:\s+([-\d.]+|n\/a))?(?:\s+([-\d.]+|n\/a))?(?:\s+(.+))?/i);
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

    // Pattern 3: Simple ONT ID + Serial + Status + [Description]
    // e.g.: 1   ZTEGD4A3C19B   Online   Pak-Budi
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

  // 1. Disable paging so output doesn't stop or truncate
  await executeCommand(config, 'terminal length 0').catch(() => {});

  // 2. Try global discovery commands
  const globalCmds = ['show ont status', 'show gpon onu state', 'show onu status', 'show ont info'];
  for (const cmd of globalCmds) {
    const res = await executeCommand(config, cmd);
    if (res.success && res.output && res.output.length > 30) {
      const parsed = parseVsolOnuOutput(res.output);
      if (parsed.length > 0) {
        addOnus(parsed);
      }
    }
  }

  // 3. Always iterate over all PON ports (1..16) to ensure all PONs (e.g. 0/1, 0/2 on V1600GT) are captured
  for (let port = 1; port <= 16; port++) {
    const res = await executeCommand(config, `show ont status 0/${port}`);
    if (res.success && res.output && !res.output.includes('Invalid') && !res.output.includes('Incomplete')) {
      addOnus(parseVsolOnuOutput(res.output, port));
    } else {
      const res2 = await executeCommand(config, `show gpon onu state 0/${port}`);
      if (res2.success && res2.output && !res2.output.includes('Invalid')) {
        addOnus(parseVsolOnuOutput(res2.output, port));
      } else {
        const res3 = await executeCommand(config, `show gpon onu state ${port}`);
        if (res3.success && res3.output && !res3.output.includes('Invalid')) {
          addOnus(parseVsolOnuOutput(res3.output, port));
        }
      }
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
    'show ont status',
    'show gpon onu state',
    'show ont status 0/1',
    'show ont status 0/2',
    'show ont status 0/3',
    'show ont status 0/4',
  ];

  const res = await executeCommandsInShell(config, cmds);
  if (res.success && res.output && res.output.length > 30) {
    addOnus(parseVsolOnuOutput(res.output));
  } else {
    for (const cmd of ['show ont status 0/1', 'show ont status 0/2']) {
      const singleRes = await sshExecute({ ...config, timeout: 5000 }, cmd);
      if (singleRes.success && singleRes.output && singleRes.output.length > 30) {
        addOnus(parseVsolOnuOutput(singleRes.output));
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
    `show ont optical-info 0/${port} ${onuId}`,
    `show gpon onu optical-info 0/${port} ${onuId}`,
    `show ont optical-info ${port} ${onuId}`,
    `show pon power onu-rx 0/${port}`,
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
    `show ont optical-info 0/${port} ${onuId}`,
    `show gpon onu optical-info 0/${port} ${onuId}`,
    `show ont optical-info ${port} ${onuId}`,
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
 * Native SNMP ONU discovery for VSOL OLTs (Proven OIDs from BotRedaman)
 * Walks:
 *   - Name:     1.3.6.1.4.1.37950.1.1.6.1.1.1.1.7 (Customer description)
 *   - Rx:       1.3.6.1.4.1.37950.1.1.6.1.1.3.1.7 (scale 10)
 *   - Tx:       1.3.6.1.4.1.37950.1.1.6.1.1.3.1.6 (scale 10)
 *   - SN:       1.3.6.1.4.1.37950.1.1.6.1.1.2.1.5
 *   - Uptime:   1.3.6.1.4.1.37950.1.1.6.1.1.1.1.8
 *   - Downtime: 1.3.6.1.4.1.37950.1.1.6.1.1.1.1.9
 */
export async function discoverONUsSNMP(
  config: SNMPConfig,
  _firmwareVersion?: string | null,
  _telnetConfig?: TelnetConfig | null
): Promise<any[]> {
  const cfg = {
    ...config,
    version: '2c' as const, // VSOL uses SNMPv2c
  };

  const [nameRes, rxRes, txRes, snRes, upRes, downRes] = await Promise.all([
    snmpWalk(cfg, '1.3.6.1.4.1.37950.1.1.6.1.1.1.1.7'),  // Description
    snmpWalk(cfg, '1.3.6.1.4.1.37950.1.1.6.1.1.3.1.7'),  // Rx Power
    snmpWalk(cfg, '1.3.6.1.4.1.37950.1.1.6.1.1.3.1.6'),  // Tx Power
    snmpWalk(cfg, '1.3.6.1.4.1.37950.1.1.6.1.1.2.1.5'),  // Serial Number
    snmpWalk(cfg, '1.3.6.1.4.1.37950.1.1.6.1.1.1.1.8'),  // Uptime
    snmpWalk(cfg, '1.3.6.1.4.1.37950.1.1.6.1.1.1.1.9'),  // Downtime
  ]);

  const names = nameRes.results || {};
  const rxMap = rxRes.results || {};
  const txMap = txRes.results || {};
  const snMap = snRes.results || {};
  const upMap = upRes.results || {};
  const downMap = downRes.results || {};

  // Helper to extract VSOL key (PON.onuId) from OID — exact BotRedaman logic (parts[-2].parts[-1])
  const getVsolKey = (oid: string): { key: string; port: number; onuId: number } | null => {
    const parts = oid.split('.');
    if (parts.length >= 2) {
      const onuId = parseInt(parts[parts.length - 1]);
      const rawPort = parseInt(parts[parts.length - 2]);
      if (!isNaN(onuId) && !isNaN(rawPort)) {
        const port = rawPort > 100 ? ((rawPort & 0xFF) || (rawPort % 100) || 1) : rawPort;
        return { key: `${rawPort}.${onuId}`, port, onuId };
      }
    }
    return null;
  };

  // Build key -> SN map (driver of discovery, exact 1:1 with BotRedaman)
  const snByKey = new Map<string, { sn: string; port: number; onuId: number }>();
  for (const [oid, val] of Object.entries(snMap)) {
    const item = getVsolKey(oid);
    if (item) {
      const sn = val.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
      if (sn && sn.length >= 6 && !/^0+$/.test(sn)) {
        snByKey.set(item.key, { sn, port: item.port, onuId: item.onuId });
      }
    }
  }

  // Also include any ONUs from nameMap (if SN is in snMap or missing)
  for (const [oid, val] of Object.entries(names)) {
    const item = getVsolKey(oid);
    if (item && val.trim()) {
      if (!snByKey.has(item.key)) {
        const rawSn = snMap[oid] || '';
        const sn = rawSn.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
        if (sn && sn.length >= 6 && !/^0+$/.test(sn)) {
          snByKey.set(item.key, { sn, port: item.port, onuId: item.onuId });
        }
      }
    }
  }

  const nameByKey = new Map<string, string>();
  for (const [oid, val] of Object.entries(names)) {
    const item = getVsolKey(oid);
    if (item && val.trim()) nameByKey.set(item.key, val.trim());
  }

  // Rx Power map (normalize_dbm scale 10.0: -38.0 <= dbm <= -5.0)
  const rxByKey = new Map<string, number>();
  for (const [oid, val] of Object.entries(rxMap)) {
    const item = getVsolKey(oid);
    if (item) {
      const raw = parseFloat(val);
      if (!isNaN(raw)) {
        const dbm = raw > 0 || raw < -100 ? raw / 10.0 : raw;
        if (dbm >= -38.0 && dbm <= -5.0) {
          rxByKey.set(item.key, parseFloat(dbm.toFixed(2)));
        }
      }
    }
  }

  // Tx Power map (scale 10.0)
  const txByKey = new Map<string, number>();
  for (const [oid, val] of Object.entries(txMap)) {
    const item = getVsolKey(oid);
    if (item) {
      const raw = parseFloat(val);
      if (!isNaN(raw)) {
        const scaled = raw > 50 || raw < -50 ? raw / 10.0 : raw;
        if (scaled >= -10 && scaled <= 15) txByKey.set(item.key, parseFloat(scaled.toFixed(2)));
      }
    }
  }

  const upByKey = new Map<string, string>();
  for (const [oid, val] of Object.entries(upMap)) {
    const item = getVsolKey(oid);
    if (item) upByKey.set(item.key, val);
  }

  const downByKey = new Map<string, string>();
  for (const [oid, val] of Object.entries(downMap)) {
    const item = getVsolKey(oid);
    if (item) downByKey.set(item.key, val);
  }

  const onus: any[] = [];
  // Loop strictly over master registered ONUs (exact BotRedaman logic)
  for (const [key, { sn, port, onuId }] of Array.from(snByKey.entries())) {
    const description = nameByKey.get(key) || null;
    const rxPower = rxByKey.get(key) ?? null;
    const txPower = txByKey.get(key) ?? null;
    const lastUp = upByKey.get(key);
    const lastDown = downByKey.get(key);

    // Exact BotRedaman status calculation logic
    const validUp = lastUp && String(lastUp) !== 'N/A' && String(lastUp) !== '0000-00-00 00:00:00' && String(lastUp) !== '';
    const validDown = lastDown && String(lastDown) !== 'N/A' && String(lastDown) !== '0000-00-00 00:00:00' && String(lastDown) !== '';

    let isOffline = false;
    if (validUp && validDown) {
      isOffline = String(lastDown) > String(lastUp);
    } else {
      isOffline = (rxPower === null);
    }

    onus.push({
      frame: 0,
      slot: 0,
      port,
      onuId,
      serialNumber: sn,
      description,
      status: isOffline ? 'offline' : 'online',
      rxPower,
      txPower,
    });
  }

  return onus;
}
