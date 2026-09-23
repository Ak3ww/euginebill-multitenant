/**
 * OLT SSH Diagnostic — Run on VPS to identify phantom SNMP entries & status issues.
 * Usage: npx tsx scripts/olt-ssh-diagnostic.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);


// ──────────────────────────────────────────────────────────────────────────────
// OLT Definitions
// ──────────────────────────────────────────────────────────────────────────────
const OLTs = [
  { name: 'HSGQ-G02ID',  ip: '192.168.30.2', port: 22,   vendor: 'hsgq', snmpPort: 161,  snmpVersion: '1',  community: 'public', user: 'root',  pass: 'admin'          },
  { name: 'VSOL-GPON',   ip: '192.168.30.6', port: 22,   vendor: 'vsol', snmpPort: 161,  snmpVersion: '2c', community: 'public', user: 'admin', pass: 'Xpon@Olt9417#'  },
  { name: 'VSOL-1600GT', ip: '192.168.30.7', port: 22,   vendor: 'vsol', snmpPort: 1615, snmpVersion: '2c', community: 'public', user: 'admin', pass: 'Xpon@Olt9417#'  },
];

// HSGQ OIDs
const HSGQ_OID_NAME   = '1.3.6.1.4.1.50224.3.12.2.1.2';
const HSGQ_OID_SN     = '1.3.6.1.4.1.50224.3.12.2.1.15';
const HSGQ_OID_STATUS = '1.3.6.1.4.1.50224.3.12.2.1.3';
const HSGQ_OID_RX     = '1.3.6.1.4.1.50224.3.12.3.1.4';

// VSOL OIDs
const VSOL_OID_SN     = '1.3.6.1.4.1.37950.1.1.6.1.1.2.1.5';
const VSOL_OID_NAME   = '1.3.6.1.4.1.37950.1.1.6.1.1.1.1.7';
const VSOL_OID_RX     = '1.3.6.1.4.1.37950.1.1.6.1.1.3.1.7';
const VSOL_OID_UP     = '1.3.6.1.4.1.37950.1.1.6.1.1.1.1.8';
const VSOL_OID_DOWN   = '1.3.6.1.4.1.37950.1.1.6.1.1.1.1.9';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function sep(title: string) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

function sub(title: string) {
  console.log(`\n── ${title} ──`);
}

async function snmpWalkRaw(host: string, port: number, version: string, community: string, oid: string): Promise<Record<string, string>> {
  const cmd = `snmpwalk -On -v${version} -c ${community} ${host}:${port} ${oid} 2>/dev/null`;
  const res = await execAsync(cmd, { timeout: 20000 }).catch(() => ({ stdout: '', stderr: '' }));
  const out = (res as any).stdout || '';
  const map: Record<string, string> = {};
  for (const line of out.split('\n')) {
    const m = line.match(/^\.?(\d[\d.]+)\s*=\s*(?:[\w-]+:\s*)?(.+)$/);
    if (m) map[m[1].trim()] = m[2].trim().replace(/"/g, '');
  }
  return map;
}

async function snmpWalkPon(host: string, port: number, version: string, community: string, baseOid: string, ponOid: string): Promise<Record<string, string>> {
  const cmd = `snmpwalk -On -v${version} -c ${community} ${host}:${port} ${ponOid} 2>/dev/null`;
  const res = await execAsync(cmd, { timeout: 10000 }).catch(() => ({ stdout: '', stderr: '' }));
  const out = (res as any).stdout || '';
  const map: Record<string, string> = {};
  for (const line of out.split('\n')) {
    const m = line.match(/^\.?(\d[\d.]+)\s*=\s*(?:[\w-]+:\s*)?(.+)$/);
    if (m) {
      // Validate it still belongs to baseOid tree
      if (m[1].trim().startsWith(baseOid.replace(/^\./, ''))) {
        map[m[1].trim()] = m[2].trim().replace(/"/g, '');
      }
    }
  }
  return map;
}

async function sshExec(host: string, port: number, user: string, pass: string, command: string): Promise<string> {
  const sshOpts = `-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -o KexAlgorithms=+diffie-hellman-group1-sha1,diffie-hellman-group14-sha1 -o HostKeyAlgorithms=+ssh-rsa,ssh-dss`;
  const cmd = `sshpass -p '${pass}' ssh ${sshOpts} -p ${port} ${user}@${host} "${command}" 2>/dev/null`;
  const res = await execAsync(cmd, { timeout: 15000 }).catch((e: any) => ({ stdout: e?.stdout || '', stderr: e?.stderr || '' }));
  return ((res as any).stdout || '').trim();
}

function extractSuffix(oid: string, baseOid: string): string {
  const base = baseOid.replace(/^\./, '');
  const full = oid.replace(/^\./, '');
  return full.startsWith(base) ? full.slice(base.length).replace(/^\./, '') : oid;
}

// ──────────────────────────────────────────────────────────────────────────────
// HSGQ Diagnostic
// ──────────────────────────────────────────────────────────────────────────────
async function diagHSGQ(olt: typeof OLTs[0]) {
  sep(`HSGQ Diagnostic: ${olt.name} (${olt.ip})`);

  // 1. SSH commands
  sub('1. SSH → actual ONT list from OLT CLI');
  const cmds = [
    'show onu table all',
    'show ont info all',
    'show gpon onu all',
    'show ont info 0 0 all',
  ];
  for (const cmd of cmds) {
    console.log(`  Command: ${cmd}`);
    const out = await sshExec(olt.ip, olt.port, olt.user, olt.pass, cmd);
    if (out && out.length > 10) {
      const lines = out.split('\n');
      const countLine = lines.filter(l => /onu|ont|total|count/i.test(l)).slice(0, 3);
      console.log(`  → ${lines.length} lines output`);
      if (countLine.length) console.log(`  → Summary lines: ${countLine.join(' | ')}`);
      console.log(`  → First 8 data lines:\n${lines.slice(0, 8).map(l => '    ' + l).join('\n')}`);
      break;
    } else {
      console.log(`  → No output / empty`);
    }
  }

  // 2. SNMP walk SN OID (master)
  sub('2. SNMP walk SN OID (raw)');
  const snMap = await snmpWalkRaw(olt.ip, olt.snmpPort, olt.snmpVersion, olt.community, HSGQ_OID_SN);
  const snKeys = Object.keys(snMap);
  console.log(`  Total SN entries: ${snKeys.length}`);
  const idxSet = new Set(snKeys.map(k => k.split('.').at(-1)!));
  console.log(`  Unique idx range: ${Math.min(...[...idxSet].map(Number))} → ${Math.max(...[...idxSet].map(Number))}`);
  console.log(`  Sample SNs (first 5):`);
  snKeys.slice(0, 5).forEach(k => console.log(`    idx=${k.split('.').at(-1)} SN=${snMap[k]}`));

  // 3. SNMP walk STATUS OID
  sub('3. SNMP walk STATUS OID (.3) — is it always 1?');
  const statusMap = await snmpWalkRaw(olt.ip, olt.snmpPort, olt.snmpVersion, olt.community, HSGQ_OID_STATUS);
  const statusVals = Object.values(statusMap);
  const statusGroups: Record<string, number> = {};
  for (const v of statusVals) { statusGroups[v] = (statusGroups[v] || 0) + 1; }
  console.log(`  Total status entries: ${statusVals.length}`);
  console.log(`  Status value distribution: ${JSON.stringify(statusGroups)}`);
  const nonOne = Object.entries(statusMap).filter(([, v]) => v !== '1');
  console.log(`  Entries with status != '1': ${nonOne.length}`);
  if (nonOne.length) {
    nonOne.slice(0, 10).forEach(([k, v]) => console.log(`    idx=${k.split('.').at(-1)} status=${v}`));
  }

  // 4. SNMP walk RX OID
  sub('4. SNMP walk RX Power OID');
  const rxMap = await snmpWalkRaw(olt.ip, olt.snmpPort, olt.snmpVersion, olt.community, HSGQ_OID_RX);
  console.log(`  Total RX entries: ${Object.keys(rxMap).length}`);
  // ONTs in SN but not in RX → offline candidates
  const inSnNotRx = [...idxSet].filter(idx => {
    const rxKey = Object.keys(rxMap).find(k => k.split('.').at(-1) === idx);
    return !rxKey;
  });
  console.log(`  ONTs in SN but NOT in RX (offline candidates): ${inSnNotRx.length}`);
  if (inSnNotRx.length) {
    console.log(`  → Indices missing RX: ${inSnNotRx.slice(0, 20).join(', ')}`);
  }

  // 5. NAME OID
  sub('5. SNMP walk NAME OID (.2)');
  const nameMap = await snmpWalkRaw(olt.ip, olt.snmpPort, olt.snmpVersion, olt.community, HSGQ_OID_NAME);
  console.log(`  Total NAME entries: ${Object.keys(nameMap).length}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// VSOL Diagnostic
// ──────────────────────────────────────────────────────────────────────────────
async function diagVSOL(olt: typeof OLTs[0]) {
  sep(`VSOL Diagnostic: ${olt.name} (${olt.ip}:${olt.snmpPort})`);

  // 1. SSH — list ONTs per PON port
  sub('1. SSH → ONT list per PON port from OLT CLI');
  const ponCmds = [
    'show gpon onu state eth 0/1',
    'show gpon onu state eth 0/2',
    'show gpon onu state eth 0/3',
    'show gpon onu state eth 0/4',
    'show onu state all',
    'show gpon onu all',
  ];
  for (const cmd of ponCmds) {
    const out = await sshExec(olt.ip, olt.port, olt.user, olt.pass, cmd);
    if (out && out.length > 10) {
      const lines = out.split('\n').filter(l => l.trim());
      console.log(`  [${cmd}] → ${lines.length} lines`);
      console.log(lines.slice(0, 10).map(l => '    ' + l).join('\n'));
    }
  }

  // 2. Root walk SN OID
  sub('2. SNMP root walk SN OID (raw — checking truncation)');
  const snRoot = await snmpWalkRaw(olt.ip, olt.snmpPort, olt.snmpVersion, olt.community, VSOL_OID_SN);
  const rootKeys = Object.keys(snRoot);
  console.log(`  Root walk total: ${rootKeys.length} entries`);

  // Detect structure
  const baseParts = VSOL_OID_SN.split('.');
  let hasSlot = false;
  let detectedSlot = 0;
  const rootPons = new Set<number>();
  for (const oid of rootKeys) {
    const parts = oid.split('.');
    const suffixLen = parts.length - baseParts.length;
    if (suffixLen >= 3) {
      hasSlot = true;
      detectedSlot = parseInt(parts[baseParts.length]);
      const pon = parseInt(parts[baseParts.length + 1]);
      if (!isNaN(pon)) rootPons.add(pon);
    } else if (suffixLen === 2) {
      const pon = parseInt(parts[parts.length - 2]);
      if (!isNaN(pon)) rootPons.add(pon);
    }
  }
  console.log(`  hasSlot: ${hasSlot}${hasSlot ? ` (slot ${detectedSlot})` : ''}`);
  console.log(`  Active PONs in root walk: ${[...rootPons].sort().join(', ')}`);

  // Show distribution per PON in root walk
  const rootPonDist: Record<number, number> = {};
  for (const oid of rootKeys) {
    const parts = oid.split('.');
    const pon = hasSlot ? parseInt(parts[baseParts.length + 1]) : parseInt(parts[parts.length - 2]);
    rootPonDist[pon] = (rootPonDist[pon] || 0) + 1;
  }
  console.log(`  Root walk distribution per PON: ${JSON.stringify(rootPonDist)}`);

  // 3. Per-PON walks (1–4) to check for phantoms
  sub('3. SNMP per-PON walk (PON 1–4) — checking for phantom data in empty ports');
  for (let pon = 1; pon <= 4; pon++) {
    const ponOid = hasSlot ? `${VSOL_OID_SN}.${detectedSlot}.${pon}` : `${VSOL_OID_SN}.${pon}`;
    const ponRes = await snmpWalkPon(olt.ip, olt.snmpPort, olt.snmpVersion, olt.community, VSOL_OID_SN, ponOid);
    const ponKeys = Object.keys(ponRes);
    if (ponKeys.length > 0) {
      // Sample first 3 and last 3
      const sample = [...ponKeys.slice(0, 3), ...ponKeys.slice(-3)];
      console.log(`  PON ${pon} (${ponOid}): ${ponKeys.length} entries`);
      sample.forEach(k => console.log(`    suffix=${extractSuffix(k, VSOL_OID_SN)} val=${ponRes[k]}`));
    } else {
      console.log(`  PON ${pon} (${ponOid}): 0 entries (empty)`);
    }
  }

  // 4. Root walk NAME OID — cross-check with SN
  sub('4. SNMP root walk NAME OID — cross-check with SN walk');
  const nameRoot = await snmpWalkRaw(olt.ip, olt.snmpPort, olt.snmpVersion, olt.community, VSOL_OID_NAME);
  console.log(`  Root walk NAME entries: ${Object.keys(nameRoot).length}`);

  // 5. Uptime/Downtime sample for status check
  sub('5. SNMP Uptime/Downtime sample (first 5 entries for status validation)');
  const upRoot = await snmpWalkRaw(olt.ip, olt.snmpPort, olt.snmpVersion, olt.community, VSOL_OID_UP);
  const downRoot = await snmpWalkRaw(olt.ip, olt.snmpPort, olt.snmpVersion, olt.community, VSOL_OID_DOWN);
  console.log(`  Uptime entries: ${Object.keys(upRoot).length}, Downtime entries: ${Object.keys(downRoot).length}`);
  const upSample = Object.entries(upRoot).slice(0, 5);
  for (const [oid, val] of upSample) {
    const suffix = extractSuffix(oid, VSOL_OID_UP);
    const downOid = Object.keys(downRoot).find(k => k.endsWith(suffix));
    const downVal = downOid ? downRoot[downOid] : 'N/A';
    const isOffline = downVal > val;
    console.log(`    key=${suffix} up="${val}" down="${downVal}" → ${isOffline ? 'OFFLINE' : 'online'}`);
  }

  // 6. SSH show ONT count summary
  sub('6. SSH → direct count verification');
  const countCmds = [
    'show gpon onu state eth 0/1 | include auth',
    'show gpon onu num',
    'show onu num',
  ];
  for (const cmd of countCmds) {
    const out = await sshExec(olt.ip, olt.port, olt.user, olt.pass, cmd);
    if (out && out.length > 2) {
      console.log(`  [${cmd}]:\n${out.split('\n').slice(0, 5).map(l => '    ' + l).join('\n')}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║          EugineBill OLT SSH+SNMP Diagnostic Tool                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const [hsgq, vsol_gs, vsol_gt] = OLTs;

  await diagHSGQ(hsgq);
  await diagVSOL(vsol_gs);
  await diagVSOL(vsol_gt);

  sep('SUMMARY');
  console.log('Done. Review above for:');
  console.log('  • HSGQ: Status distribution (is .3 always 1? Which indices missing RX?)');
  console.log('  • VSOL-GS: Root walk count vs per-PON PON 1 count — are they same?');
  console.log('  • VSOL-GS: Does PON 2 per-PON walk return phantom entries?');
  console.log('  • VSOL-GT: What PONs appear in root walk vs per-PON walks?');
  console.log('  • VSOL-GT: Do empty PON ports (3-4) return stale data?');
}

main().catch(console.error);
