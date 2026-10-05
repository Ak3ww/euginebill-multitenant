
export interface CalculateNextBillingExpiryOptions {
  currentExpiredAt?: Date | null;
  billingDay?: number | null;
  fixedBillingDate?: number | null;
  shiftBillingDateIfLate?: boolean;
  validityValue?: number;
  validityUnit?: string;
  paymentDate?: Date;
  isNewInstallationOrProrate?: boolean;
}

/**
 * Mendapatkan komponen kalender WIB (Western Indonesia Time, UTC+7).
 * Karena Indonesia bagian barat tidak memiliki Daylight Saving Time,
 * offset ke UTC selalu tepat +7 jam (+25,200,000 ms).
 */
export function getWibDateParts(date: Date) {
  const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: wibTime.getUTCFullYear(),
    month: wibTime.getUTCMonth(), // 0-11
    day: wibTime.getUTCDate(), // 1-31
    hours: wibTime.getUTCHours(),
    minutes: wibTime.getUTCMinutes(),
    seconds: wibTime.getUTCSeconds(),
    milliseconds: wibTime.getUTCMilliseconds(),
  };
}

/**
 * Membuat objek Date yang mewakili tanggal (year, month, day) pada jam 23:59:59.999 WIB.
 * Di waktu UTC, 23:59:59.999 WIB adalah 16:59:59.999 UTC pada tanggal kalender yang sama.
 * Tanggal secara otomatis di-clamp ke batas maksimum hari pada bulan tersebut (misal Feb: 28/29, Apr: 30).
 */
export function createWibEndOfDay(year: number, month: number, day: number): Date {
  const maxDayInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const clampedDay = Math.min(Math.max(1, day), maxDayInMonth);
  return new Date(Date.UTC(year, month, clampedDay, 23, 59, 59, 999));
}

/**
 * Menghitung tanggal batas masa aktif (expiryDate) untuk siklus tagihan bulan tertentu (cycleYear, cycleMonth 0-indexed).
 * 
 * Aturan Bisnis:
 * - Hari jatuh tempo tagihan (effectiveDueDay): default 6.
 * - Hari masa aktif berakhir (expiryDay): effectiveDueDay - 1.
 * - Jika effectiveDueDay === 1, maka expiryDay adalah hari terakhir bulan berjalan (siklus kalender murni).
 * - Misal siklus September (cycleMonth = 8) dengan dueDay = 6:
 *   expiryDay = 5 Oktober (bulan M+1 tanggal 5) pukul 23:59:59.999 WIB.
 * - Misal siklus September (cycleMonth = 8) dengan dueDay = 1:
 *   expiryDay = 30 September pukul 23:59:59.999 WIB.
 */
export function getCycleExpiryDate(
  cycleYear: number,
  cycleMonth: number,
  effectiveDueDay: number
): Date {
  const dueMonthRaw = cycleMonth + 1;
  const dueYear = dueMonthRaw > 11 ? cycleYear + Math.floor(dueMonthRaw / 12) : cycleYear;
  const dueMonth = ((dueMonthRaw % 12) + 12) % 12;

  if (effectiveDueDay === 1) {
    // Jatuh tempo tanggal 1 di dueMonth -> masa aktif berakhir pada hari terakhir cycleMonth
    const lastDayOfCycleMonth = new Date(Date.UTC(cycleYear, cycleMonth + 1, 0)).getUTCDate();
    return createWibEndOfDay(cycleYear, cycleMonth, lastDayOfCycleMonth);
  } else {
    // Jatuh tempo effectiveDueDay di dueMonth -> masa aktif berakhir pada (effectiveDueDay - 1) di dueMonth
    const expiryDay = effectiveDueDay - 1;
    return createWibEndOfDay(dueYear, dueMonth, expiryDay);
  }
}

/**
 * Menghitung dueDate invoice dari expiryDate dan dueDay.
 * Misal: expiry 5 Okt -> dueDate 6 Okt (23:59:59.999 WIB).
 * Jika dueDay === 1 dan expiry 30 Sept -> dueDate 1 Okt (23:59:59.999 WIB).
 */
export function getCycleDueDate(expiryDate: Date, dueDay?: number | null): Date {
  const effectiveDueDay = dueDay ? Math.min(Math.max(dueDay, 1), 31) : 6;
  const expWib = getWibDateParts(expiryDate);

  if (effectiveDueDay === 1) {
    // Expiry adalah hari terakhir expWib.month (misal 30 Sept)
    // Due date adalah tanggal 1 bulan berikutnya (misal 1 Okt)
    const nextMonthRaw = expWib.month + 1;
    const dueYear = nextMonthRaw > 11 ? expWib.year + Math.floor(nextMonthRaw / 12) : expWib.year;
    const dueMonth = ((nextMonthRaw % 12) + 12) % 12;
    return createWibEndOfDay(dueYear, dueMonth, 1);
  } else {
    // Expiry adalah (effectiveDueDay - 1) pada expWib.month (misal 5 Okt)
    // Due date adalah effectiveDueDay pada bulan yang sama (misal 6 Okt)
    return createWibEndOfDay(expWib.year, expWib.month, effectiveDueDay);
  }
}

/**
 * Modul terpusat kalkulasi masa aktif billing PPPoE.
 * Mendukung pemanggilan baik melalui Options Object maupun Positional Arguments.
 */
export function calculateNextBillingExpiry(options: CalculateNextBillingExpiryOptions): Date;
export function calculateNextBillingExpiry(
  currentExpiredAt?: Date | null,
  billingDay?: number | null,
  fixedBillingDate?: number | null,
  shiftBillingDateIfLate?: boolean,
  validityValue?: number,
  validityUnit?: string,
  paymentDate?: Date,
  isNewInstallationOrProrate?: boolean
): Date;
export function calculateNextBillingExpiry(
  paramOrOptions?: Date | null | CalculateNextBillingExpiryOptions,
  billingDayArg?: number | null,
  fixedBillingDateArg?: number | null,
  shiftBillingDateIfLateArg?: boolean,
  validityValueArg?: number,
  validityUnitArg?: string,
  paymentDateArg?: Date,
  isNewInstallationOrProrateArg?: boolean
): Date {
  // Parsing parameter: dukung bentuk Options Object atau Positional Arguments
  let currentExpiredAt: Date | null | undefined;
  let billingDay: number | null | undefined;
  let fixedBillingDate: number | null | undefined = 6;
  let shiftBillingDateIfLate: boolean = false;
  let validityValue: number = 1;
  let validityUnit: string = 'MONTHS';
  let paymentDate: Date = new Date();
  let isNewInstallationOrProrate: boolean = false;

  if (
    paramOrOptions !== null &&
    paramOrOptions !== undefined &&
    typeof paramOrOptions === 'object' &&
    !(paramOrOptions instanceof Date)
  ) {
    const opts = paramOrOptions as CalculateNextBillingExpiryOptions;
    currentExpiredAt = opts.currentExpiredAt;
    billingDay = opts.billingDay;
    fixedBillingDate = opts.fixedBillingDate ?? 6;
    shiftBillingDateIfLate = opts.shiftBillingDateIfLate ?? false;
    validityValue = opts.validityValue ?? 1;
    validityUnit = opts.validityUnit ?? 'MONTHS';
    paymentDate = opts.paymentDate ?? new Date();
    isNewInstallationOrProrate = opts.isNewInstallationOrProrate ?? false;
  } else {
    currentExpiredAt = paramOrOptions as Date | null | undefined;
    billingDay = billingDayArg;
    fixedBillingDate = fixedBillingDateArg ?? 6;
    shiftBillingDateIfLate = shiftBillingDateIfLateArg ?? false;
    validityValue = validityValueArg ?? 1;
    validityUnit = validityUnitArg ?? 'MONTHS';
    paymentDate = paymentDateArg ?? new Date();
    isNewInstallationOrProrate = isNewInstallationOrProrateArg ?? false;
  }

  // Hari tagihan (effectiveDueDay): billingDay || fixedBillingDate || 6
  const rawDueDay = billingDay || fixedBillingDate || 6;
  const effectiveDueDay = Math.min(Math.max(rawDueDay, 1), 31);

  const payWib = getWibDateParts(paymentDate);
  const nowMs = paymentDate.getTime();
  const currentExpiryMs = currentExpiredAt ? new Date(currentExpiredAt).getTime() : null;

  // Kasus non-bulan (misal paket harian prepaid: DAYS, HOURS, MINUTES)
  const normalizedUnit = (validityUnit || 'MONTHS').toUpperCase();
  if (normalizedUnit !== 'MONTHS') {
    let baseDate: Date;
    if (currentExpiryMs && currentExpiryMs > nowMs && !isNewInstallationOrProrate) {
      baseDate = new Date(currentExpiredAt!);
    } else {
      baseDate = new Date(paymentDate);
    }

    if (normalizedUnit === 'DAYS') {
      const baseWib = getWibDateParts(baseDate);
      const targetDate = new Date(Date.UTC(baseWib.year, baseWib.month, baseWib.day + validityValue));
      return createWibEndOfDay(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate());
    } else if (normalizedUnit === 'HOURS') {
      return new Date(baseDate.getTime() + validityValue * 60 * 60 * 1000);
    } else if (normalizedUnit === 'MINUTES') {
      return new Date(baseDate.getTime() + validityValue * 60 * 1000);
    }
  }

  // ============================================================
  // SIKLUS BERGESER: shiftBillingDateIfLate === true
  // ============================================================
  if (shiftBillingDateIfLate) {
    // Jika pelanggan masih aktif dan belum telat, lanjutkan dari currentExpiredAt
    // Jika telat / sudah lewat masa aktif / pelanggan baru: geser dari paymentDate
    let baseDate: Date;
    if (currentExpiryMs && currentExpiryMs > nowMs && !isNewInstallationOrProrate) {
      baseDate = new Date(currentExpiredAt!);
    } else {
      baseDate = new Date(paymentDate);
    }

    const baseWib = getWibDateParts(baseDate);
    const targetMonthRaw = baseWib.month + validityValue;
    const targetYear = targetMonthRaw > 11 ? baseWib.year + Math.floor(targetMonthRaw / 12) : baseWib.year;
    const targetMonth = ((targetMonthRaw % 12) + 12) % 12;

    return createWibEndOfDay(targetYear, targetMonth, baseWib.day);
  }

  // ============================================================
  // SIKLUS TERKUNCI MATI DI expiryDay: shiftBillingDateIfLate === false
  // ============================================================

  // Kasus 1: Pelanggan rutin (masih aktif, currentExpiredAt >= paymentDate, bukan instalasi baru/prorate)
  // Perpanjang siklus berikutnya dari currentExpiredAt
  const isRegularActive =
    !isNewInstallationOrProrate &&
    currentExpiryMs !== null &&
    currentExpiryMs >= nowMs;

  if (isRegularActive && currentExpiredAt) {
    const expWib = getWibDateParts(currentExpiredAt);

    // Tentukan cycleMonth basis dari currentExpiredAt:
    // Jika effectiveDueDay === 1: currentExpiredAt adalah hari terakhir expWib.month (siklus expWib.month)
    // Jika effectiveDueDay > 1: currentExpiredAt adalah hari (effectiveDueDay - 1) di expWib.month (siklus expWib.month - 1)
    let baseCycleMonth: number;
    let baseCycleYear: number;

    if (effectiveDueDay === 1) {
      baseCycleMonth = expWib.month;
      baseCycleYear = expWib.year;
    } else {
      baseCycleMonth = expWib.month - 1;
      if (baseCycleMonth < 0) {
        baseCycleMonth = 11;
        baseCycleYear = expWib.year - 1;
      } else {
        baseCycleYear = expWib.year;
      }
    }

    const nextCycleMonth = baseCycleMonth + validityValue;
    return getCycleExpiryDate(baseCycleYear, nextCycleMonth, effectiveDueDay);
  }

  // Kasus 2: Pelanggan baru / bayar prorate / bayar telat (currentExpiredAt telah lewat atau null)
  // Masa aktif jatuh pada batas expiryDay di bulan tagihan berjalan (berdasarkan paymentDate).
  // Misal di September (payWib.month = 8): batas berikutnya adalah 5 Oktober (atau 30 September jika dueDay = 1).
  const currentBillingCycleMonth = payWib.month;
  const currentBillingCycleYear = payWib.year;

  // Jika bayar untuk multi-bulan (validityValue > 1), tambahkan siklus berikutnya
  const targetCycleMonth = currentBillingCycleMonth + (validityValue - 1);
  return getCycleExpiryDate(currentBillingCycleYear, targetCycleMonth, effectiveDueDay);
}
