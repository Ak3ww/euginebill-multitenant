/**
 * OLT <-> Inventory Asset Synchronization Service
 * Provides single-source-of-truth reconciliation between live OLT ONUs,
 * warehouse inventory assets, and customer device assignments.
 * Includes Auto-Swap protection and Dismantle automation.
 */

import { prisma } from '@/server/db/client';
import { detectOntVendorAndModel, normalizeSerialNumber } from '@/lib/olt/ont-detector';
import { findSmartMatchForOnu, CandidateCustomer } from '@/lib/olt/smart-matcher';

export interface SyncOnuInput {
  serialNumber: string;
  macAddress?: string | null;
  customerId?: string | null;
  oltVendor?: string | null;
  oltName?: string | null;
  location?: string | null;
  description?: string | null;
  isOnline?: boolean;
  installedAt?: Date;
}

export interface SyncResult {
  assetId: string;
  serialNumber: string;
  vendor: string;
  model: string;
  status: string;
  isNew: boolean;
  customerId: string | null;
}

/**
 * Ensure default ONT master catalog item exists in inventory for a specific vendor
 */
export async function getOrCreateDefaultOntItem(vendor?: string): Promise<{ id: string; sku: string }> {
  const vUpper = (vendor || '').toUpperCase().trim();
  let skuCandidate = 'EMG-CPE-ONT-GENERIC';

  if (vUpper.includes('ZTE')) skuCandidate = 'EMG-CPE-ONT-ZTE';
  else if (vUpper.includes('HUA') || vUpper.includes('HW')) skuCandidate = 'EMG-CPE-ONT-HUAWEI';
  else if (vUpper.includes('SKY') || vUpper.includes('SK')) skuCandidate = 'EMG-CPE-ONT-SKYWORTH';
  else if (vUpper.includes('FIB') || vUpper.includes('FB')) skuCandidate = 'EMG-CPE-ONT-FIBERHOME';
  else if (vUpper.includes('HSG')) skuCandidate = 'EMG-CPE-ONT-HSGQ';
  else if (vUpper.includes('VSOL') || vUpper.includes('VSL')) skuCandidate = 'EMG-CPE-ONT-VSOL';

  const existingItem = await prisma.inventoryItem.findFirst({
    where: {
      OR: [
        { sku: skuCandidate },
        { sku: 'EMG-CPE-ONT-GENERIC' },
        { categoryCode: 'CPE', subCategory: 'ONT' },
      ],
    },
    select: { id: true, sku: true },
  });

  if (existingItem) return existingItem;

  const newItem = await prisma.inventoryItem.create({
    data: {
      sku: skuCandidate,
      name: `Modem ONT ${vendor || 'Generic'}`,
      categoryCode: 'CPE',
      subCategory: 'ONT',
      unit: 'unit',
      isSerialized: true,
      currentStock: 0,
      isActive: true,
      description: `Master katalog unit modem ONT ${vendor || 'Generic'} terdeteksi dari OLT`,
    },
    select: { id: true, sku: true },
  });

  return newItem;
}

/**
 * Recalculates currentStock for all CPE modem items based on AVAILABLE warehouse assets
 */
export async function recalculateCpeItemStock(): Promise<void> {
  try {
    const cpeItems = await prisma.inventoryItem.findMany({
      where: { categoryCode: 'CPE', isActive: true },
      include: { assets: { select: { status: true } } },
    });

    for (const item of cpeItems) {
      const warehouseStock = item.assets.filter((a) => a.status === 'AVAILABLE').length;
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: warehouseStock },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[recalculateCpeItemStock] Error recalculating CPE stock:', err);
  }
}

/**
 * Checks if a description indicates a public facility / operational device
 */
function isFasumDescription(desc?: string | null): boolean {
  if (!desc) return false;
  const upper = desc.toUpperCase();
  return (
    upper.includes('FASUM') ||
    upper.includes('CCTV') ||
    upper.includes('MUSHOLA') ||
    upper.includes('MASJID') ||
    upper.includes('POS ') ||
    upper.includes('POS-') ||
    upper.includes('SATPAM') ||
    upper.includes('BALAI') ||
    upper.includes('KANTOR') ||
    upper.includes('AP-') ||
    upper.includes('ACCESS POINT') ||
    upper.includes('RT0') ||
    upper.includes('RW0')
  );
}

/**
 * Synchronize a single OLT ONU to the inventory assets table and link customer
 * Features Auto-Swap Protection: If customer already has another modem,
 * the old modem is automatically returned to inventory as USED_GOOD and unassigned.
 */
export async function syncOnuToInventory(input: SyncOnuInput): Promise<SyncResult | null> {
  const cleanSn = normalizeSerialNumber(input.serialNumber);
  if (!cleanSn) return null;

  const detected = detectOntVendorAndModel(cleanSn, null, input.oltVendor);
  const defaultItem = await getOrCreateDefaultOntItem(detected.vendor);

  // 1. Auto-Swap Protection: If customer is specified, check if they currently have another active modem
  if (input.customerId) {
    const previousActiveAssets = await prisma.inventoryAsset.findMany({
      where: {
        currentCustomerId: input.customerId,
        serialNumber: { not: cleanSn },
        status: 'IN_USE',
        assetType: 'MODEM',
      },
    });

    for (const prevAsset of previousActiveAssets) {
      // Auto-release old asset back to warehouse stock
      await prisma.inventoryAsset.update({
        where: { id: prevAsset.id },
        data: {
          status: 'USED_GOOD',
          currentCustomerId: null,
          notes: `Auto-swap: Digantikan oleh modem ${cleanSn}`.slice(0, 190),
          updatedAt: new Date(),
        },
      });

      // Record device replacement history
      await prisma.customerDeviceHistory.create({
        data: {
          customerId: input.customerId,
          assetId: prevAsset.id,
          serialNumber: prevAsset.serialNumber,
          macAddress: prevAsset.macAddress,
          vendor: prevAsset.vendor,
          model: prevAsset.model,
          action: 'REPLACED_OLD',
          reason: `Auto-swap digantikan oleh modem ${cleanSn}`,
          installedAt: prevAsset.installedAt || new Date(),
          removedAt: new Date(),
        },
      }).catch(() => {});
    }

    // Also unassign customer from old ONU in OLT if different SN
    await prisma.oltOnuStatus.updateMany({
      where: {
        customerId: input.customerId,
        serialNumber: { not: cleanSn },
      },
      data: {
        customerId: null,
      },
    }).catch(() => {});
  }

  // 2. Check existing asset
  const existingAsset = await prisma.inventoryAsset.findUnique({
    where: { serialNumber: cleanSn },
    include: { customer: { select: { id: true, username: true } } },
  });

  let assetId: string;
  let isNew = false;

  // Determine status & notes for Fasum / Customer / Unassigned
  const isFasum = !input.customerId && isFasumDescription(input.description);
  const targetStatus = input.customerId
    ? 'IN_USE'
    : isFasum
    ? 'IN_USE' // Fasum is considered in-use in the field
    : 'AVAILABLE';

  const defaultLocation = (input.location
    ? `${input.oltName || 'OLT'} Port ${input.location}`
    : input.oltName || 'Gudang Utama').slice(0, 190);

  const rawNote = input.customerId
    ? `Terpasang di pelanggan • OLT ${input.oltName || ''} (${input.location || ''})`
    : isFasum
    ? `Fasum / Lapangan: "${input.description || ''}" • OLT ${input.oltName || ''} (${input.location || ''})`
    : input.description
    ? `Unassigned di OLT ${input.oltName || ''}: "${input.description}" (${input.location || ''})`
    : `Terdeteksi di OLT ${input.oltName || ''} (${input.location || ''})`;

  const generatedNote = rawNote.slice(0, 190);

  if (existingAsset) {
    assetId = existingAsset.id;
    const updateData: any = {
      status: targetStatus,
      currentCustomerId: input.customerId || null,
      updatedAt: new Date(),
    };

    // OLT is single source of truth: always sync vendor & model from OLT detection
    if (detected.vendor && detected.vendor !== 'Generic') {
      updateData.vendor = detected.vendor;
      updateData.model = detected.model;
    } else if (!existingAsset.vendor || existingAsset.vendor === 'Generic') {
      updateData.vendor = detected.vendor;
      updateData.model = detected.model;
    }

    if (input.macAddress) {
      updateData.macAddress = input.macAddress;
    }
    if (input.customerId && !existingAsset.installedAt) {
      updateData.installedAt = input.installedAt || new Date();
    }
    if (defaultLocation) {
      updateData.location = defaultLocation;
    }
    if (generatedNote) {
      updateData.notes = generatedNote;
    }

    await prisma.inventoryAsset.update({
      where: { id: existingAsset.id },
      data: updateData,
    });
  } else {
    isNew = true;
    const created = await prisma.inventoryAsset.create({
      data: {
        itemId: defaultItem.id,
        assetType: 'MODEM',
        serialNumber: cleanSn,
        macAddress: input.macAddress || null,
        vendor: detected.vendor,
        model: detected.model,
        condition: input.customerId || isFasum || input.isOnline ? 'USED_GOOD' : 'NEW',
        status: targetStatus,
        currentCustomerId: input.customerId || null,
        location: defaultLocation,
        installedAt: input.customerId ? (input.installedAt || new Date()) : null,
        notes: generatedNote,
      },
      select: { id: true },
    });
    assetId = created.id;
  }

  // 3. Update customer PPPoE record & Device History if assigned
  if (input.customerId && input.customerId !== 'undefined') {
    const customer = await prisma.pppoeUser.findFirst({
      where: {
        OR: [
          { id: input.customerId },
          { customerId: input.customerId },
          { username: input.customerId },
        ],
      },
      select: { id: true, macAddress: true, username: true },
    });

    if (customer) {
      if (input.macAddress && customer.macAddress !== input.macAddress) {
        await prisma.pppoeUser.update({
          where: { id: customer.id },
          data: { macAddress: input.macAddress },
        }).catch(() => {});
      }

      const lastHistory = await prisma.customerDeviceHistory.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!lastHistory || lastHistory.serialNumber !== cleanSn) {
        await prisma.customerDeviceHistory.create({
          data: {
            customerId: customer.id,
            assetId,
            serialNumber: cleanSn,
            macAddress: input.macAddress || null,
            vendor: detected.vendor,
            model: detected.model,
            action: 'INSTALLED',
            reason: `Sinkronisasi 1-Pintu OLT ${input.oltName || ''}`,
            installedAt: input.installedAt || new Date(),
          },
        }).catch(() => {});
      }
    }
  }

  recalculateCpeItemStock().catch(() => {});

  return {
    assetId,
    serialNumber: cleanSn,
    vendor: detected.vendor,
    model: detected.model,
    status: targetStatus,
    isNew,
    customerId: input.customerId || null,
  };
}

/**
 * Automatically dismantles customer device when customer stops or SPK dismantle completes.
 * Returns modem back to warehouse stock as USED_GOOD, unassigns OLT ONU, and frees ODP port.
 */
export async function dismantleCustomerDevice(
  customerId: string,
  reason: string = 'Cabut perangkat / Pelanggan berhenti',
  technicianName?: string
): Promise<{ dismantledCount: number }> {
  const now = new Date();

  // 1. Find all active assets for this customer
  const activeAssets = await prisma.inventoryAsset.findMany({
    where: { currentCustomerId: customerId, status: 'IN_USE', assetType: 'MODEM' },
  });

  let dismantledCount = 0;

  for (const asset of activeAssets) {
    await prisma.inventoryAsset.update({
      where: { id: asset.id },
      data: {
        status: 'USED_GOOD',
        currentCustomerId: null,
        notes: `Dicabut dari pelanggan (Dismantle): ${reason}`.slice(0, 190),
        updatedAt: now,
      },
    });

    await prisma.customerDeviceHistory.create({
      data: {
        customerId,
        assetId: asset.id,
        serialNumber: asset.serialNumber,
        macAddress: asset.macAddress,
        vendor: asset.vendor,
        model: asset.model,
        action: 'DISMANTLED',
        reason,
        technicianName: technicianName || 'Admin',
        installedAt: asset.installedAt || now,
        removedAt: now,
      },
    }).catch(() => {});

    dismantledCount++;
  }

  // 2. Also clear customer assignment from OLT ONU record
  await prisma.oltOnuStatus.updateMany({
    where: { customerId },
    data: { customerId: null },
  }).catch(() => {});

  // 3. Clear ODP assignment
  await prisma.odpCustomerAssignment.deleteMany({
    where: { customerId },
  }).catch(() => {});

  recalculateCpeItemStock().catch(() => {});

  return { dismantledCount };
}

/**
 * Preview full sync of all OLT ONUs to inventory
 */
export async function previewOltInventorySync() {
  const [onus, existingAssets] = await Promise.all([
    prisma.oltOnuStatus.findMany({
      include: {
        olt: { select: { id: true, name: true, vendor: true } },
        customer: { select: { id: true, username: true, name: true, status: true } },
      },
    }),
    prisma.inventoryAsset.findMany({
      where: { assetType: 'MODEM' },
      select: { id: true, serialNumber: true, vendor: true, model: true, status: true, currentCustomerId: true },
    }),
  ]);

  const existingMap = new Map<string, typeof existingAssets[0]>();
  for (const a of existingAssets) {
    if (a.serialNumber) existingMap.set(a.serialNumber.toUpperCase().trim(), a);
  }

  let alreadyInInventory = 0;
  let newToImport = 0;
  let assignedToCustomer = 0;
  let fasumCount = 0;
  const vendorBreakdown: Record<string, number> = {};

  const items = onus.map((onu) => {
    const cleanSn = normalizeSerialNumber(onu.serialNumber);
    const detected = detectOntVendorAndModel(cleanSn, null, onu.olt?.vendor);
    const existing = cleanSn ? existingMap.get(cleanSn) : null;
    const isFasum = !onu.customer && isFasumDescription(onu.description);

    if (existing) {
      alreadyInInventory++;
    } else if (cleanSn) {
      newToImport++;
    }

    if (onu.customer) {
      assignedToCustomer++;
    } else if (isFasum) {
      fasumCount++;
    }

    const v = detected.vendor || 'Lainnya';
    vendorBreakdown[v] = (vendorBreakdown[v] || 0) + 1;

    return {
      onuId: onu.id,
      serialNumber: cleanSn || onu.macAddress || 'N/A',
      macAddress: onu.macAddress,
      description: onu.description,
      oltName: onu.olt?.name || 'OLT',
      oltVendor: onu.olt?.vendor,
      location: `${onu.port}:${onu.onuId}`,
      status: onu.status,
      isFasum,
      detectedVendor: detected.vendor,
      detectedModel: detected.model,
      alreadyInInventory: !!existing,
      currentCustomer: onu.customer
        ? {
            id: onu.customer.id,
            username: onu.customer.username,
            name: onu.customer.name,
            status: onu.customer.status,
          }
        : null,
    };
  });

  return {
    totalOnus: onus.length,
    alreadyInInventory,
    newToImport,
    assignedToCustomer,
    fasumCount,
    vendorBreakdown,
    items,
  };
}

/**
 * Execute full sync of all OLT ONUs into inventory
 * Ensures 100% of ONUs from all 3 OLTs (customers, Fasum, unassigned) are recorded in inventory!
 */
export async function syncAllOltsToInventory(): Promise<{
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  linkedCustomerCount: number;
  fasumCount: number;
}> {
  // Auto-heal table schema on MySQL: ensure notes column is TEXT to avoid varchar length limits
  await prisma.$executeRawUnsafe(`ALTER TABLE inventory_assets MODIFY notes TEXT`).catch(() => {});

  const onus = await prisma.oltOnuStatus.findMany({
    include: {
      olt: { select: { id: true, name: true, vendor: true } },
    },
  });

  let createdCount = 0;
  let updatedCount = 0;
  let linkedCustomerCount = 0;
  let fasumCount = 0;

  for (const onu of onus) {
    if (!onu.serialNumber && !onu.macAddress) continue;

    try {
      const isFasum = !onu.customerId && isFasumDescription(onu.description);
      if (isFasum) fasumCount++;

      const res = await syncOnuToInventory({
        serialNumber: onu.serialNumber || onu.macAddress!,
        macAddress: onu.macAddress,
        customerId: onu.customerId,
        oltVendor: onu.olt?.vendor,
        oltName: onu.olt?.name,
        location: `${onu.frame}/${onu.slot}/${onu.port}:${onu.onuId}`,
        description: onu.description,
        isOnline: onu.status === 'online',
        installedAt: onu.updatedAt,
      });

      if (res) {
        if (res.isNew) createdCount++;
        else updatedCount++;
        if (res.customerId) linkedCustomerCount++;
      }
    } catch (err: any) {
      console.error(`[syncAllOltsToInventory] Error syncing ONU ${onu.serialNumber || onu.macAddress}:`, err.message);
    }
  }

  return {
    totalProcessed: onus.length,
    createdCount,
    updatedCount,
    linkedCustomerCount,
    fasumCount,
  };
}

export interface FullSyncStats {
  totalOnus: number;
  totalCustomers: number;
  alreadyLinkedCount: number;
  newlyMatchedCount: number;
  unassignedCount: number;
  fasumCount: number;
  inventoryCreatedCount: number;
  inventoryUpdatedCount: number;
  matchedDetails: Array<{
    onuId: string;
    oltName: string;
    location: string;
    serialNumber: string;
    macAddress?: string | null;
    description?: string | null;
    customerId: string;
    customerUsername: string;
    customerName: string;
    matchReason: string;
  }>;
}

/**
 * Execute full smart reconciliation:
 * 1. Matches all ONUs in all OLTs to PPPoE Customers via Serial Number, MAC, and Smart Matcher
 * 2. Links customerId in oltOnuStatus
 * 3. Registers / updates all modems in inventoryAsset (IN_USE for customers, AVAILABLE for stock, IN_USE for fasum)
 * 4. Logs customerDeviceHistory so it appears in the customer profile "Perangkat ONT"
 */
export async function syncAllOltsWithCustomersAndInventory(minScoreThreshold = 75): Promise<FullSyncStats> {
  // Auto-heal table schema on MySQL: ensure notes column is TEXT to avoid varchar length limits
  await prisma.$executeRawUnsafe(`ALTER TABLE inventory_assets MODIFY notes TEXT`).catch(() => {});

  const [olts, rawCustomers] = await Promise.all([
    prisma.networkOLT.findMany({
      include: {
        routers: { select: { routerId: true } },
        onuStatuses: {
          include: {
            customer: { select: { id: true, username: true, name: true, phone: true, status: true, customerId: true, macAddress: true } },
          },
          orderBy: [{ port: 'asc' }, { onuId: 'asc' }],
        },
      },
    }),
    prisma.pppoeUser.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        customerId: true,
        status: true,
        macAddress: true,
        routerId: true,
        router: { select: { name: true } },
        workOrders: {
          where: { status: 'COMPLETED' },
          select: { id: true, reportData: true },
        },
        deviceHistories: {
          select: { serialNumber: true, macAddress: true },
        },
      },
    }),
  ]);

  // Build candidate customers for smart matcher
  const candidates: CandidateCustomer[] = rawCustomers.map((c) => ({
    id: c.id,
    username: c.username,
    name: c.name,
    phone: c.phone,
    customerId: c.customerId,
    status: c.status,
    macAddress: c.macAddress,
    routerId: c.routerId,
    routerName: c.router?.name ?? null,
  }));

  // Fast exact lookups
  const customerById = new Map<string, typeof rawCustomers[0]>();
  const customerByMac = new Map<string, typeof rawCustomers[0]>();
  const customerBySn = new Map<string, typeof rawCustomers[0]>();

  for (const c of rawCustomers) {
    customerById.set(c.id, c);

    if (c.macAddress) {
      const cleanMac = c.macAddress.toUpperCase().replace(/[:-]/g, '').trim();
      if (cleanMac) customerByMac.set(cleanMac, c);
    }

    // Index serial numbers from deviceHistories
    for (const h of c.deviceHistories) {
      if (h.serialNumber) {
        const s = normalizeSerialNumber(h.serialNumber);
        if (s) customerBySn.set(s, c);
      }
      if (h.macAddress) {
        const m = h.macAddress.toUpperCase().replace(/[:-]/g, '').trim();
        if (m) customerByMac.set(m, c);
      }
    }

    // Index serial numbers from completed work orders
    for (const wo of c.workOrders) {
      const rd = (wo.reportData || {}) as any;
      if (rd.sn) {
        const s = normalizeSerialNumber(String(rd.sn));
        if (s) customerBySn.set(s, c);
      }
      if (rd.mac) {
        const m = String(rd.mac).toUpperCase().replace(/[:-]/g, '').trim();
        if (m) customerByMac.set(m, c);
      }
    }
  }

  let totalOnus = 0;
  let alreadyLinkedCount = 0;
  let newlyMatchedCount = 0;
  let unassignedCount = 0;
  let fasumCount = 0;
  let inventoryCreatedCount = 0;
  let inventoryUpdatedCount = 0;
  const matchedDetails: FullSyncStats['matchedDetails'] = [];

  for (const olt of olts) {
    const oltRouterIds = olt.routers.map((r) => r.routerId);

    for (const onu of olt.onuStatuses) {
      totalOnus++;
      const cleanSn = normalizeSerialNumber(onu.serialNumber);
      const cleanMac = onu.macAddress ? onu.macAddress.toUpperCase().replace(/[:-]/g, '').trim() : '';
      const isFasum = !onu.customerId && isFasumDescription(onu.description);

      let targetCustomerId: string | null = onu.customerId;
      let matchReason = 'Sudah Tertaut Sebelumnya';
      let wasNewlyMatched = false;

      if (targetCustomerId) {
        alreadyLinkedCount++;
      } else {
        // Pass 1: Check by SN in SPK or device history
        if (cleanSn && customerBySn.has(cleanSn)) {
          const matched = customerBySn.get(cleanSn)!;
          targetCustomerId = matched.id;
          matchReason = 'Cocok Serial Number SPK/Riwayat Perangkat';
          wasNewlyMatched = true;
        }
        // Pass 2: Check by MAC Address
        else if (cleanMac && customerByMac.has(cleanMac)) {
          const matched = customerByMac.get(cleanMac)!;
          targetCustomerId = matched.id;
          matchReason = 'Cocok MAC Address Pelanggan';
          wasNewlyMatched = true;
        }
        // Pass 3: Smart Matcher by description / name / username / customerId
        else if (onu.description && onu.description.trim()) {
          const { bestMatch } = findSmartMatchForOnu(
            {
              serialNumber: onu.serialNumber,
              macAddress: onu.macAddress,
              description: onu.description,
            },
            candidates,
            {
              oltRouterIds,
              minScoreThreshold,
            }
          );

          if (bestMatch && bestMatch.customer) {
            targetCustomerId = bestMatch.customer.id;
            matchReason = `${bestMatch.reason} (Skor: ${bestMatch.score})`;
            wasNewlyMatched = true;
          }
        }

        if (wasNewlyMatched && targetCustomerId) {
          newlyMatchedCount++;
          // Persist link to oltOnuStatus
          await prisma.oltOnuStatus.update({
            where: { id: onu.id },
            data: { customerId: targetCustomerId },
          }).catch((err) => console.error('[Sync OLT] Update onu customerId error:', err));
        } else if (isFasum) {
          fasumCount++;
        } else {
          unassignedCount++;
        }
      }

      // Sync customer's MAC address if user macAddress is missing and ONU has MAC
      if (targetCustomerId && onu.macAddress) {
        const cust = customerById.get(targetCustomerId);
        if (cust && !cust.macAddress) {
          await prisma.pppoeUser.update({
            where: { id: targetCustomerId },
            data: { macAddress: onu.macAddress },
          }).catch(() => {});
        }
      }

      // Record matched detail
      if (targetCustomerId) {
        const cust = customerById.get(targetCustomerId);
        if (cust) {
          matchedDetails.push({
            onuId: onu.id,
            oltName: olt.name,
            location: `${onu.frame}/${onu.slot}/${onu.port}:${onu.onuId}`,
            serialNumber: cleanSn || onu.macAddress || 'N/A',
            macAddress: onu.macAddress,
            description: onu.description,
            customerId: cust.id,
            customerUsername: cust.username,
            customerName: cust.name,
            matchReason,
          });
        }
      }

      // Sync to Inventory Assets & Customer Device History
      if (cleanSn || onu.macAddress) {
        try {
          const syncRes = await syncOnuToInventory({
            serialNumber: cleanSn || onu.macAddress!,
            macAddress: onu.macAddress,
            customerId: targetCustomerId,
            oltVendor: olt.vendor,
            oltName: olt.name,
            location: `${onu.frame}/${onu.slot}/${onu.port}:${onu.onuId}`,
            description: onu.description,
            isOnline: onu.status === 'online',
            installedAt: onu.updatedAt,
          });

          if (syncRes) {
            if (syncRes.isNew) inventoryCreatedCount++;
            else inventoryUpdatedCount++;
          }
        } catch (syncErr: any) {
          console.error(`[syncAllOltsWithCustomersAndInventory] Sync error on ${cleanSn || onu.macAddress}:`, syncErr.message);
        }
      }
    }
  }

  return {
    totalOnus,
    totalCustomers: rawCustomers.length,
    alreadyLinkedCount,
    newlyMatchedCount,
    unassignedCount,
    fasumCount,
    inventoryCreatedCount,
    inventoryUpdatedCount,
    matchedDetails,
  };
}
