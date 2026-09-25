import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/config';
import { prisma } from '@/server/db/client';
import { HotspotUserService } from '@/server/services/mikrotik/hotspot-user.service';

export async function GET() {
  try {
    const company = await prisma.company.findFirst();
    
    // Load genieacs enabled state
    const genieacsSettings = await prisma.genieacsSettings.findFirst();
    const genieacsEnabled = Boolean(genieacsSettings?.isActive);

    if (!company) {
      // Return default if no company exists
      return NextResponse.json({
        name: 'EugineBill RADIUS',
        email: 'admin@EugineBill.com',
        phone: '+62 812-3456-7890',
        address: 'Jakarta, Indonesia',
        baseUrl: 'http://localhost:3000',
        adminPhone: '+62 812-3456-7890',
        timezone: 'Asia/Jakarta',
        logo: null,
        poweredBy: 'EugineBill RADIUS',
        footerAdmin: 'Powered by EugineBill RADIUS',
        footerCustomer: 'Powered by EugineBill RADIUS',
        footerTechnician: 'Powered by EugineBill RADIUS',
        footerAgent: 'Powered by EugineBill RADIUS',
        radiusEnabled: false,
        radiusHotspotEnabled: false,
        radiusPppoeEnabled: false,
        enableProrate: true,
        fixedBillingDate: 6,
        shiftBillingDateIfLate: false,
        isolateProfileName: null,
        genieacsEnabled: false,
      });
    }

    return NextResponse.json({ ...company, genieacsEnabled });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const existingCompany = await prisma.company.findFirst();

    // Allow company update if session is authenticated OR if no company exists yet (first-time setup)
    if (!session && existingCompany) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Parse bank accounts if provided
    let bankAccounts = data.bankAccounts;
    if (bankAccounts && typeof bankAccounts === 'string') {
      try {
        bankAccounts = JSON.parse(bankAccounts);
      } catch (e) {
        console.error('Error parsing bank accounts:', e);
        bankAccounts = [];
      }
    }
    
    let company;
    if (existingCompany) {
      // Update existing
      company = await prisma.company.update({
        where: { id: existingCompany.id },
        data: {
          name: data.name || existingCompany.name,
          email: data.email ?? existingCompany.email,
          phone: data.phone ?? data.adminPhone ?? existingCompany.phone,
          address: data.address ?? existingCompany.address,
          baseUrl: data.baseUrl ?? existingCompany.baseUrl,
          adminPhone: data.adminPhone ?? data.phone ?? existingCompany.adminPhone,
          logo: data.logo ?? existingCompany.logo,
          timezone: data.timezone ?? existingCompany.timezone,
          poweredBy: data.poweredBy ?? existingCompany.poweredBy,
          customerIdPrefix: data.customerIdPrefix ?? existingCompany.customerIdPrefix,
          footerAdmin: data.footerAdmin ?? existingCompany.footerAdmin,
          footerCustomer: data.footerCustomer ?? existingCompany.footerCustomer,
          footerTechnician: data.footerTechnician ?? existingCompany.footerTechnician,
          footerAgent: data.footerAgent ?? existingCompany.footerAgent,
          bankAccounts: bankAccounts ?? existingCompany.bankAccounts,
          invoiceGenerateDays: data.invoiceGenerateDays ? parseInt(data.invoiceGenerateDays) : existingCompany.invoiceGenerateDays,
          radiusEnabled: data.radiusPppoeEnabled !== undefined ? Boolean(data.radiusPppoeEnabled) : existingCompany.radiusEnabled,
          radiusHotspotEnabled: data.radiusHotspotEnabled ?? existingCompany.radiusHotspotEnabled,
          radiusPppoeEnabled: data.radiusPppoeEnabled ?? existingCompany.radiusPppoeEnabled,
          enableProrate: data.enableProrate ?? existingCompany.enableProrate,
          fixedBillingDate: data.fixedBillingDate ? parseInt(data.fixedBillingDate) : existingCompany.fixedBillingDate,
          shiftBillingDateIfLate: data.shiftBillingDateIfLate ?? existingCompany.shiftBillingDateIfLate,
          isolateProfileName: data.isolateProfileName ?? existingCompany.isolateProfileName,
          psbWaGroupId: data.psbWaGroupId !== undefined ? (data.psbWaGroupId || null) : existingCompany.psbWaGroupId,
        },
      });

      // Synchronize RADIUS isolation & services on MikroTik routers when toggles change
      const radiusPppoe = data.radiusPppoeEnabled !== undefined 
        ? Boolean(data.radiusPppoeEnabled) 
        : Boolean(existingCompany?.radiusPppoeEnabled);
      const radiusHotspot = data.radiusHotspotEnabled !== undefined 
        ? Boolean(data.radiusHotspotEnabled) 
        : Boolean(existingCompany?.radiusHotspotEnabled);

      const togglesChanged = 
        (data.radiusHotspotEnabled !== undefined && data.radiusHotspotEnabled !== existingCompany?.radiusHotspotEnabled) ||
        (data.radiusPppoeEnabled !== undefined && data.radiusPppoeEnabled !== existingCompany?.radiusPppoeEnabled);

      if (togglesChanged) {
        prisma.router.findMany({ where: { isActive: true }, select: { id: true } })
          .then(async (routers) => {
            for (const r of routers) {
              await HotspotUserService.syncRadiusConfiguration(r.id, {
                radiusPppoe,
                radiusHotspot,
              });
            }
            if (!radiusHotspot) {
              // Switched to local auth: ensure all vouchers exist on MikroTik (Zero Downtime)
              await HotspotUserService.reconcileAllVouchersToMikrotik();
            }
          })
          .catch((err) => console.error('[API Company] Failed to sync radius toggles to routers:', err));
      }
    } else {
      // Create new
      company = await prisma.company.create({
        data: {
          id: crypto.randomUUID(),
          name: data.name || 'PT Eugine Solusi Internet',
          email: data.email || 'admin@isp.net',
          phone: data.phone || data.adminPhone || '081234567890',
          address: data.address || 'Jakarta, Indonesia',
          baseUrl: data.baseUrl || 'http://localhost:3000',
          adminPhone: data.adminPhone || data.phone || '081234567890',
          logo: data.logo || null,
          timezone: data.timezone || 'Asia/Jakarta',
          poweredBy: data.poweredBy || 'EugineBill RADIUS',
          customerIdPrefix: data.customerIdPrefix ?? null,
          footerAdmin: data.footerAdmin || 'Powered by EugineBill RADIUS',
          footerCustomer: data.footerCustomer || 'Powered by EugineBill RADIUS',
          footerTechnician: data.footerTechnician || 'Powered by EugineBill RADIUS',
          footerAgent: data.footerAgent || 'Powered by EugineBill RADIUS',
          bankAccounts: bankAccounts,
          invoiceGenerateDays: data.invoiceGenerateDays ? parseInt(data.invoiceGenerateDays) : 7,
          radiusEnabled: Boolean(data.radiusPppoeEnabled),
          radiusHotspotEnabled: data.radiusHotspotEnabled ?? false,
          radiusPppoeEnabled: data.radiusPppoeEnabled ?? false,
          enableProrate: data.enableProrate ?? true,
          fixedBillingDate: data.fixedBillingDate ? parseInt(data.fixedBillingDate) : 6,
          shiftBillingDateIfLate: data.shiftBillingDateIfLate ?? false,
          isolateProfileName: data.isolateProfileName ?? null,
          psbWaGroupId: data.psbWaGroupId || null,
        },
      });
    }
    
    // If timezone changed, update configuration files
    if (data.timezone && data.timezone !== existingCompany?.timezone) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const timezoneUpdateResponse = await fetch(`${baseUrl}/api/settings/timezone`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-call': 'true', // Mark as internal call
          },
          body: JSON.stringify({ timezone: data.timezone }),
        });
        
        const timezoneResult = await timezoneUpdateResponse.json();
        
        if (!timezoneUpdateResponse.ok) {
          console.error('Failed to update timezone files:', timezoneResult);
        }
      } catch (error) {
        console.error('Error calling timezone update API:', error);
      }
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error saving company:', error);
    return NextResponse.json(
      { error: 'Failed to save company settings' },
      { status: 500 }
    );
  }
}
