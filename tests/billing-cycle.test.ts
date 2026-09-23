import { describe, it, expect } from 'vitest';
import {
  calculateNextBillingExpiry,
  getCycleDueDate,
  getWibDateParts,
  createWibEndOfDay,
  getCycleExpiryDate,
} from '@/server/services/billing/billing-cycle.service';

describe('billing-cycle.service', () => {
  describe('WIB date helpers', () => {
    it('creates exact 23:59:59.999 WIB timestamp (16:59:59.999 UTC)', () => {
      // 5 October 2026 at 23:59:59.999 WIB
      const d = createWibEndOfDay(2026, 9, 5);
      expect(d.toISOString()).toBe('2026-10-05T16:59:59.999Z');

      const parts = getWibDateParts(d);
      expect(parts.year).toBe(2026);
      expect(parts.month).toBe(9); // October
      expect(parts.day).toBe(5);
      expect(parts.hours).toBe(23);
      expect(parts.minutes).toBe(59);
      expect(parts.seconds).toBe(59);
      expect(parts.milliseconds).toBe(999);
    });

    it('clamps to last day of month if day exceeds days in month', () => {
      // February 2026 (non-leap year, 28 days)
      const d = createWibEndOfDay(2026, 1, 31);
      expect(d.toISOString()).toBe('2026-02-28T16:59:59.999Z');

      const parts = getWibDateParts(d);
      expect(parts.year).toBe(2026);
      expect(parts.month).toBe(1);
      expect(parts.day).toBe(28);
    });
  });

  describe('getCycleExpiryDate', () => {
    it('calculates cycle expiry for September with dueDay = 6 as 5 October 23:59:59 WIB', () => {
      // September 2026 (month = 8), dueDay = 6 -> expiryDay = 5 of October (month = 9)
      const expiry = getCycleExpiryDate(2026, 8, 6);
      expect(expiry.toISOString()).toBe('2026-10-05T16:59:59.999Z');
    });

    it('calculates cycle expiry for September with dueDay = 1 as 30 September 23:59:59 WIB', () => {
      // September 2026 (month = 8), dueDay = 1 -> expiry is last day of September (30 Sept)
      const expiry = getCycleExpiryDate(2026, 8, 1);
      expect(expiry.toISOString()).toBe('2026-09-30T16:59:59.999Z');
    });

    it('handles December to January year rollover cleanly', () => {
      // December 2026 (month = 11), dueDay = 6 -> expiry is 5 January 2027
      const expiry = getCycleExpiryDate(2026, 11, 6);
      expect(expiry.toISOString()).toBe('2027-01-05T16:59:59.999Z');
    });
  });

  describe('getCycleDueDate', () => {
    it('calculates dueDate 6 Oct from expiry 5 Oct', () => {
      const expiry = createWibEndOfDay(2026, 9, 5); // 5 Oct
      const due = getCycleDueDate(expiry, 6);
      expect(due.toISOString()).toBe('2026-10-06T16:59:59.999Z');
    });

    it('calculates dueDate 1 Oct from expiry 30 Sept when dueDay = 1', () => {
      const expiry = createWibEndOfDay(2026, 8, 30); // 30 Sept
      const due = getCycleDueDate(expiry, 1);
      expect(due.toISOString()).toBe('2026-10-01T16:59:59.999Z');
    });

    it('calculates dueDate 1 Jan 2027 from expiry 31 Dec 2026 when dueDay = 1', () => {
      const expiry = createWibEndOfDay(2026, 11, 31); // 31 Dec
      const due = getCycleDueDate(expiry, 1);
      expect(due.toISOString()).toBe('2027-01-01T16:59:59.999Z');
    });
  });

  describe('calculateNextBillingExpiry', () => {
    it('Scenario 1: PSB / Prorate in September -> expires 5 October 23:59:59 WIB', () => {
      const result = calculateNextBillingExpiry({
        currentExpiredAt: null,
        billingDay: 6,
        fixedBillingDate: 6,
        shiftBillingDateIfLate: false,
        validityValue: 1,
        validityUnit: 'MONTHS',
        paymentDate: new Date('2026-09-23T11:00:00+07:00'),
        isNewInstallationOrProrate: true,
      });

      expect(result.toISOString()).toBe('2026-10-05T16:59:59.999Z');
    });

    it('Scenario 2: Regular user active until 5 Oct paying on 2 Oct -> advances to 5 November 23:59:59 WIB', () => {
      const currentExpiry = createWibEndOfDay(2026, 9, 5); // 5 Oct 23:59:59 WIB
      const payDate = new Date('2026-10-02T10:00:00+07:00');

      const result = calculateNextBillingExpiry({
        currentExpiredAt: currentExpiry,
        billingDay: 6,
        fixedBillingDate: 6,
        shiftBillingDateIfLate: false,
        validityValue: 1,
        validityUnit: 'MONTHS',
        paymentDate: payDate,
      });

      expect(result.toISOString()).toBe('2026-11-05T16:59:59.999Z');
    });

    it('Scenario 3: Regular user paying early on 28 Sept -> advances to 5 November 23:59:59 WIB', () => {
      const currentExpiry = createWibEndOfDay(2026, 9, 5); // 5 Oct 23:59:59 WIB
      const payDate = new Date('2026-09-28T14:30:00+07:00');

      const result = calculateNextBillingExpiry({
        currentExpiredAt: currentExpiry,
        billingDay: 6,
        fixedBillingDate: 6,
        shiftBillingDateIfLate: false,
        validityValue: 1,
        validityUnit: 'MONTHS',
        paymentDate: payDate,
      });

      expect(result.toISOString()).toBe('2026-11-05T16:59:59.999Z');
    });

    it('Scenario 4: Late payment on 15 Oct with shiftBillingDateIfLate = false -> locked to 5 November 23:59:59 WIB', () => {
      const currentExpiry = createWibEndOfDay(2026, 9, 5); // 5 Oct (expired!)
      const payDate = new Date('2026-10-15T09:00:00+07:00'); // Late payment

      const result = calculateNextBillingExpiry({
        currentExpiredAt: currentExpiry,
        billingDay: 6,
        fixedBillingDate: 6,
        shiftBillingDateIfLate: false,
        validityValue: 1,
        validityUnit: 'MONTHS',
        paymentDate: payDate,
      });

      expect(result.toISOString()).toBe('2026-11-05T16:59:59.999Z');
    });

    it('Scenario 5: Late payment on 15 Oct with shiftBillingDateIfLate = true -> shifts to 15 November 23:59:59 WIB', () => {
      const currentExpiry = createWibEndOfDay(2026, 9, 5); // 5 Oct (expired!)
      const payDate = new Date('2026-10-15T09:00:00+07:00'); // Late payment

      const result = calculateNextBillingExpiry({
        currentExpiredAt: currentExpiry,
        billingDay: 6,
        fixedBillingDate: 6,
        shiftBillingDateIfLate: true,
        validityValue: 1,
        validityUnit: 'MONTHS',
        paymentDate: payDate,
      });

      expect(result.toISOString()).toBe('2026-11-15T16:59:59.999Z');
    });

    it('Scenario 6: Multi-month payment (validityValue = 3)', () => {
      const currentExpiry = createWibEndOfDay(2026, 9, 5); // 5 Oct
      const payDate = new Date('2026-10-02T10:00:00+07:00');

      const result = calculateNextBillingExpiry({
        currentExpiredAt: currentExpiry,
        billingDay: 6,
        fixedBillingDate: 6,
        shiftBillingDateIfLate: false,
        validityValue: 3,
        validityUnit: 'MONTHS',
        paymentDate: payDate,
      });

      // 5 Oct + 3 months -> 5 Jan 2027
      expect(result.toISOString()).toBe('2027-01-05T16:59:59.999Z');
    });

    it('Scenario 7: Positional arguments overload works identically to options object', () => {
      const payDate = new Date('2026-09-23T11:00:00+07:00');
      const rPos = calculateNextBillingExpiry(
        null,
        6,
        6,
        false,
        1,
        'MONTHS',
        payDate,
        true
      );
      expect(rPos.toISOString()).toBe('2026-10-05T16:59:59.999Z');
    });

    it('Scenario 8: dueDay = 1 with regular user active until 30 Sept paying on 28 Sept', () => {
      const currentExpiry = createWibEndOfDay(2026, 8, 30); // 30 Sept
      const payDate = new Date('2026-09-28T10:00:00+07:00');

      const result = calculateNextBillingExpiry({
        currentExpiredAt: currentExpiry,
        billingDay: 1,
        fixedBillingDate: 1,
        shiftBillingDateIfLate: false,
        validityValue: 1,
        validityUnit: 'MONTHS',
        paymentDate: payDate,
      });

      expect(result.toISOString()).toBe('2026-10-31T16:59:59.999Z'); // 31 Oct
    });

    it('Scenario 9: validityUnit = DAYS adds exact days at 23:59:59.999 WIB', () => {
      const payDate = new Date('2026-09-23T10:00:00+07:00');
      const result = calculateNextBillingExpiry({
        currentExpiredAt: null,
        validityValue: 7,
        validityUnit: 'DAYS',
        paymentDate: payDate,
      });

      // 23 Sept + 7 days -> 30 Sept at 23:59:59.999 WIB
      expect(result.toISOString()).toBe('2026-09-30T16:59:59.999Z');
    });

    it('Scenario 10: Default parameters without options object', () => {
      const payDate = new Date('2026-09-23T10:00:00+07:00');
      const result = calculateNextBillingExpiry({
        paymentDate: payDate,
      });

      // Defaults: fixedBillingDate = 6, shiftBillingDateIfLate = false, validityValue = 1
      // In September -> 5 October 23:59:59.999 WIB
      expect(result.toISOString()).toBe('2026-10-05T16:59:59.999Z');
    });
  });
});
