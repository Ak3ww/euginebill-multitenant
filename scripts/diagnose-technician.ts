/**
 * Technician Diagnosis & Account Doctor Script for EugineBill VPS
 *
 * Usage:
 *   npx tsx scripts/diagnose-technician.ts
 *   npx tsx scripts/diagnose-technician.ts --test <username/phone> <password>
 *   npx tsx scripts/diagnose-technician.ts --create <name> <username> <phone> <password>
 *   npx tsx scripts/diagnose-technician.ts --reset-password <username/phone> <newPassword>
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('======================================================');
  console.log('      EUGINEBILL TECHNICIAN DIAGNOSIS DOCTOR          ');
  console.log('======================================================\n');

  // 1. Check ENV Configuration
  console.log('--- [1] Environment Variables Check ---');
  console.log('NODE_ENV         :', process.env.NODE_ENV || '(not set - defaults to development)');
  console.log('JWT_SECRET       :', process.env.JWT_SECRET ? '✅ CONFIGURED (' + process.env.JWT_SECRET.slice(0, 4) + '***)' : '⚠️ MISSING (will fallback to NEXTAUTH_SECRET)');
  console.log('NEXTAUTH_SECRET  :', process.env.NEXTAUTH_SECRET ? '✅ CONFIGURED (' + process.env.NEXTAUTH_SECRET.slice(0, 4) + '***)' : '⚠️ MISSING');
  console.log('DATABASE_URL     :', process.env.DATABASE_URL ? '✅ CONFIGURED' : '❌ MISSING');
  console.log('');

  // 2. Query `technician` table
  console.log('--- [2] Technicians Table (`technician`) ---');
  const techs = await prisma.technician.findMany({
    orderBy: { createdAt: 'desc' },
  });

  if (techs.length === 0) {
    console.log('⚠️ No records found in `technician` table.');
  } else {
    console.log(`Found ${techs.length} technician(s):`);
    techs.forEach((t, i) => {
      console.log(`  [${i + 1}] ID: ${t.id}`);
      console.log(`      Name        : ${t.name}`);
      console.log(`      Username    : ${t.username || '(none)'}`);
      console.log(`      Phone       : ${t.phoneNumber}`);
      console.log(`      Active      : ${t.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`      Require OTP : ${t.requireOtp ? '⚠️ YES (Must login via OTP)' : 'NO (Password login)'}`);
      console.log(`      Has Password: ${t.password ? (t.password.startsWith('$2') ? '✅ YES (bcrypt hashed)' : '⚠️ YES (plain text)') : '❌ NO PASSWORD'}`);
      console.log(`      Last Login  : ${t.lastLoginAt ? t.lastLoginAt.toISOString() : '(never)'}`);
      console.log('');
    });
  }

  // 3. Query `adminUser` table with role TECHNICIAN or SUPER_ADMIN
  console.log('--- [3] Admin Users (`admin_users`) Role Check ---');
  const adminUsers = await prisma.adminUser.findMany({
    where: {
      OR: [
        { role: 'TECHNICIAN' },
        { role: 'SUPER_ADMIN' },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      isActive: true,
      lastLogin: true,
    },
  });

  if (adminUsers.length === 0) {
    console.log('⚠️ No TECHNICIAN or SUPER_ADMIN users found in `admin_users` table.');
  } else {
    console.log(`Found ${adminUsers.length} admin user(s):`);
    adminUsers.forEach((u, i) => {
      console.log(`  [${i + 1}] ID: ${u.id}`);
      console.log(`      Username : ${u.username}`);
      console.log(`      Name     : ${u.name}`);
      console.log(`      Phone    : ${u.phone || '(none)'}`);
      console.log(`      Role     : ${u.role}`);
      console.log(`      Active   : ${u.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`      LastLogin: ${u.lastLogin ? u.lastLogin.toISOString() : '(never)'}`);
      console.log('');
    });
  }

  // 4. Test Login Simulation
  if (command === '--test') {
    const inputIdentifier = args[1];
    const inputPassword = args[2];

    if (!inputIdentifier || !inputPassword) {
      console.log('❌ Usage: npx tsx scripts/diagnose-technician.ts --test <username/phone> <password>');
      return;
    }

    console.log(`--- [4] Simulating Login for: "${inputIdentifier}" ---`);
    const cleanInput = inputIdentifier.trim();
    const digitsOnly = cleanInput.replace(/\D/g, '');
    const phone62 = digitsOnly ? (digitsOnly.startsWith('62') ? digitsOnly : digitsOnly.startsWith('0') ? '62' + digitsOnly.substring(1) : '62' + digitsOnly) : '';
    const phone0 = digitsOnly ? (digitsOnly.startsWith('62') ? '0' + digitsOnly.substring(2) : digitsOnly.startsWith('0') ? digitsOnly : '0' + digitsOnly) : '';

    const possibleIdentifiers = Array.from(new Set([
      cleanInput,
      cleanInput.toLowerCase(),
      cleanInput.toUpperCase(),
      digitsOnly,
      phone62,
      phone0,
      phone62 ? `+${phone62}` : '',
    ].filter(Boolean)));

    // Search technician table
    const tech = await prisma.technician.findFirst({
      where: {
        OR: [
          { username: { in: possibleIdentifiers } },
          { phoneNumber: { in: possibleIdentifiers } },
          { email: { in: possibleIdentifiers } },
        ],
      },
    });

    if (tech) {
      console.log(`✅ Found in \`technician\` table: ID=${tech.id}, Name=${tech.name}`);
      if (!tech.isActive) {
        console.log('❌ FAILED: Technician account is INACTIVE (isActive=false)');
        return;
      }
      if (!tech.password) {
        console.log('❌ FAILED: Technician has NO password set in database');
        return;
      }

      const isBcrypt = tech.password.startsWith('$2a$') || tech.password.startsWith('$2b$');
      const isMatch = isBcrypt
        ? await bcrypt.compare(inputPassword, tech.password)
        : tech.password === inputPassword;

      if (isMatch) {
        console.log('🎉 SUCCESS: Password MATCHES! Login is valid.');
      } else {
        console.log('❌ FAILED: Password DOES NOT MATCH.');
      }
      return;
    }

    // Search admin_users table
    const adminUser = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: { in: possibleIdentifiers } },
          { phone: { in: possibleIdentifiers } },
          { email: { in: possibleIdentifiers } },
        ],
      },
    });

    if (adminUser) {
      console.log(`✅ Found in \`admin_users\` table: ID=${adminUser.id}, Username=${adminUser.username}, Role=${adminUser.role}`);
      if (!adminUser.isActive) {
        console.log('❌ FAILED: Admin user is INACTIVE (isActive=false)');
        return;
      }
      const isBcrypt = adminUser.password.startsWith('$2a$') || adminUser.password.startsWith('$2b$');
      const isMatch = isBcrypt
        ? await bcrypt.compare(inputPassword, adminUser.password)
        : adminUser.password === inputPassword;

      if (isMatch) {
        console.log('🎉 SUCCESS: Admin User Password MATCHES! Login is valid.');
      } else {
        console.log('❌ FAILED: Admin User Password DOES NOT MATCH.');
      }
      return;
    }

    console.log(`❌ FAILED: No user found matching "${inputIdentifier}" in either \`technician\` or \`admin_users\`.`);
  }

  // 5. Create Technician CLI Command
  if (command === '--create') {
    const name = args[1];
    const username = args[2];
    const phone = args[3];
    const password = args[4];

    if (!name || !username || !phone || !password) {
      console.log('❌ Usage: npx tsx scripts/diagnose-technician.ts --create <name> <username> <phone> <password>');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('62') ? cleanPhone : cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : '62' + cleanPhone;
    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await prisma.technician.upsert({
      where: { phoneNumber: formattedPhone },
      update: {
        name,
        username,
        password: hashedPassword,
        isActive: true,
        requireOtp: false,
      },
      create: {
        name,
        username,
        phoneNumber: formattedPhone,
        password: hashedPassword,
        isActive: true,
        requireOtp: false,
      },
    });

    console.log(`🎉 Technician successfully created/updated: ID=${created.id}, Username=${created.username}, Phone=${created.phoneNumber}`);
  }

  // 6. Reset Password CLI Command
  if (command === '--reset-password') {
    const identifier = args[1];
    const newPassword = args[2];

    if (!identifier || !newPassword) {
      console.log('❌ Usage: npx tsx scripts/diagnose-technician.ts --reset-password <username/phone> <newPassword>');
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const tech = await prisma.technician.findFirst({
      where: {
        OR: [
          { username: identifier },
          { phoneNumber: identifier },
          { phoneNumber: identifier.replace(/\D/g, '') },
        ],
      },
    });

    if (tech) {
      await prisma.technician.update({
        where: { id: tech.id },
        data: { password: hashedPassword, isActive: true, requireOtp: false },
      });
      console.log(`🎉 Password reset for technician "${tech.name}" (${tech.username || tech.phoneNumber})!`);
      return;
    }

    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: identifier },
          { phone: identifier },
        ],
      },
    });

    if (admin) {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { password: hashedPassword, isActive: true },
      });
      console.log(`🎉 Password reset for admin user "${admin.name}" (${admin.username})!`);
      return;
    }

    console.log(`❌ No user found matching "${identifier}"`);
  }

  console.log('\n======================================================');
  console.log('Commands available:');
  console.log('  npx tsx scripts/diagnose-technician.ts --test <user> <pass>');
  console.log('  npx tsx scripts/diagnose-technician.ts --create <name> <username> <phone> <pass>');
  console.log('  npx tsx scripts/diagnose-technician.ts --reset-password <user> <newPass>');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Diagnosis error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
