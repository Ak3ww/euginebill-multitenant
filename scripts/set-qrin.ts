import { prisma } from '../src/server/db/client';

async function main() {
  const token = process.argv[2] || '7nOIOzohPZMhiZcV9UkK62Ym73h8FUqbYsGEm4BAEfWWdQuUZhuzCRzsyeL31J6a';

  console.log(`[QRIN Injector] Setting up QRIN with token: ${token.slice(0, 8)}...`);

  const existing = await prisma.paymentGateway.findUnique({
    where: { provider: 'qrin' },
  });

  let result;
  if (existing) {
    result = await prisma.paymentGateway.update({
      where: { provider: 'qrin' },
      data: {
        qrinToken: token,
        isActive: true,
        name: 'QRIN',
      },
    });
    console.log('✅ QRIN configuration successfully UPDATED and ACTIVATED!');
  } else {
    result = await prisma.paymentGateway.create({
      data: {
        id: `pg_qrin_${Date.now()}`,
        provider: 'qrin',
        name: 'QRIN',
        qrinToken: token,
        isActive: true,
      },
    });
    console.log('✅ QRIN configuration successfully CREATED and ACTIVATED!');
  }

  console.log('\n--- Status Database Terkini ---');
  console.log('Provider :', result.provider);
  console.log('Name     :', result.name);
  console.log('Is Active:', result.isActive ? '✅ YES (AKTIF)' : '❌ NO');
  console.log('Token    :', result.qrinToken ? `${result.qrinToken.slice(0, 10)}... (Tersimpan)` : 'KOSONG');
}

main()
  .catch((e) => {
    console.error('❌ Error injecting QRIN:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
