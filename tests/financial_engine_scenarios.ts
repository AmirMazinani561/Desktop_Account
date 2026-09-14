// =============================================================================
//  tests/financial_engine_scenarios.ts — تست‌های طلایی و اعتبارسنجی سناریوهای مالی
//  سند بالادستی: DATA_MODEL.md بند ۱۰ و ۱۵ • PRD.md نسخه ۰.۵
// =============================================================================

import { fromDate, parseJalali } from '../lib/jalali.ts';

interface AccountDto {
  id: string;
  companyId: string;
  parentId?: string | null;
  code: string;
  depth: number;
  accountClass: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  accountKind: string;
  name: string;
  isPostable: boolean;
  isSystem: boolean;
}

interface JournalLineDto {
  id: string;
  lineNo: number;
  accountId: string;
  side: 'DEBIT' | 'CREDIT';
  amount: bigint;
  lineRole: 'SOURCE' | 'DESTINATION' | 'FEE' | 'PRINCIPAL' | 'INTEREST' | 'TAX' | 'DISCOUNT' | 'COGS' | 'MAIN';
  description?: string;
}

interface JournalDto {
  id: string;
  companyId: string;
  fiscalYearId: string;
  fiscalPeriodId: string;
  serialNo?: bigint | null;
  date: Date;
  jalaliYear: number;
  jalaliMonth: number;
  jalaliDay: number;
  kind: string;
  status: 'DRAFT' | 'POSTED' | 'VOID';
  totalDebit: bigint;
  totalCredit: bigint;
  lineCount: number;
  refNo?: string | null;
  lines: JournalLineDto[];
}

/**
 * اعتبارسنجی تراز و تغییرناپذیری سند (شبیه‌سازی قوانین دیتابیس)
 */
export function validateJournal(journal: JournalDto): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  let sumDebit = 0n;
  let sumCredit = 0n;

  if (journal.lines.length < 2) {
    errors.push('سند باید حداقل دارای ۲ آرتیکل باشد.');
  }

  for (const line of journal.lines) {
    if (line.amount <= 0n) {
      errors.push(`مبلغ آرتیکل سطر ${line.lineNo} باید بزرگ‌تر از صفر باشد.`);
    }
    if (line.side === 'DEBIT') {
      sumDebit += line.amount;
    } else if (line.side === 'CREDIT') {
      sumCredit += line.amount;
    } else {
      errors.push(`جهت سطر ${line.lineNo} نامعتبر است.`);
    }
  }

  if (sumDebit !== sumCredit) {
    errors.push(`سند ناهم‌تراز است: جمع بدهکار (${sumDebit}) با جمع بستانکار (${sumCredit}) برابر نیست.`);
  }

  if (journal.status === 'POSTED') {
    if (sumDebit <= 0n) {
      errors.push('سند ثبت‌شده باید دارای مبلغ مثبت باشد.');
    }
    if (!journal.serialNo) {
      errors.push('سند ثبت‌شده باید دارای شماره سریال باشد.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * شبیه‌سازی تولید کد خودکار حساب‌ها (منطبق با fn_next_account_code)
 */
export function generateAccountCode(
  parentCode: string | null,
  parentDepth: number,
  existingSiblingCodes: string[]
): string {
  if (!parentCode) {
    return '1';
  }
  const padLen = parentDepth <= 2 ? 2 : 3;
  let maxSuffix = 0;

  for (const code of existingSiblingCodes) {
    if (code.startsWith(parentCode)) {
      const suffixStr = code.slice(parentCode.length);
      const suffixNum = parseInt(suffixStr, 10);
      if (!isNaN(suffixNum) && suffixNum > maxSuffix) {
        maxSuffix = suffixNum;
      }
    }
  }

  const nextSuffix = (maxSuffix + 1).toString().padStart(padLen, '0');
  return `${parentCode}${nextSuffix}`;
}

/**
 * تبدیل یک تراکنش سنتی از کیف پول قدیمی به سند دو/سه‌آرتیکلی استاندارد
 */
export function convertLegacyTransaction(legacyTx: {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  fee?: number;
  fromAccountId: string;
  toAccountId: string;
  date: Date | string;
  shamsiDate: string;
  description?: string;
  trackingNumber?: string;
}): JournalDto {
  const dateDetails = fromDate(legacyTx.date);
  const amountBigInt = BigInt(Math.round(legacyTx.amount));
  const feeBigInt = BigInt(Math.round(legacyTx.fee || 0));

  const lines: JournalLineDto[] = [];

  // سطر ۱: بستانکار مبدأ (مبلغ + کارمزد)
  lines.push({
    id: 'line-1',
    lineNo: 1,
    accountId: legacyTx.fromAccountId,
    side: 'CREDIT',
    amount: amountBigInt + feeBigInt,
    lineRole: 'SOURCE',
    description: legacyTx.description,
  });

  // سطر ۲: بدهکار مقصد (مبلغ اصلی)
  lines.push({
    id: 'line-2',
    lineNo: 2,
    accountId: legacyTx.toAccountId,
    side: 'DEBIT',
    amount: amountBigInt,
    lineRole: 'DESTINATION',
    description: legacyTx.description,
  });

  // سطر ۳ (در صورت وجود کارمزد): بدهکار حساب هزینه کارمزد
  if (feeBigInt > 0n) {
    lines.push({
      id: 'line-3',
      lineNo: 3,
      accountId: 'acc-bank-fee-50108',
      side: 'DEBIT',
      amount: feeBigInt,
      lineRole: 'FEE',
      description: 'کارمزد بانکی',
    });
  }

  const totalDebit = amountBigInt + feeBigInt;
  const totalCredit = amountBigInt + feeBigInt;

  return {
    id: legacyTx.id,
    companyId: 'comp-1',
    fiscalYearId: 'fy-1405',
    fiscalPeriodId: `fp-1405-${dateDetails.jm}`,
    serialNo: 1n,
    date: dateDetails.date,
    jalaliYear: dateDetails.jy,
    jalaliMonth: dateDetails.jm,
    jalaliDay: dateDetails.jd,
    kind: 'IMPORT',
    status: 'POSTED',
    totalDebit,
    totalCredit,
    lineCount: lines.length,
    refNo: legacyTx.trackingNumber || null,
    lines,
  };
}

// =============================================================================
//  اجرای تست‌های خودکار سناریوها
// =============================================================================

export function runAllScenarios(): void {
  console.log('=== شروع تست‌های طلایی موتور مالی ===');

  // سناریو ۱۰.۱: انتقال ساده بانک به صندوق (۵٬۰۰۰٬۰۰۰ ریال)
  console.log('\n--- سناریو ۱۰.۱: انتقال بانک به صندوق ---');
  const s101 = convertLegacyTransaction({
    id: 'tx-101',
    type: 'transfer',
    amount: 5_000_000,
    fromAccountId: 'acc-bank-mellat',
    toAccountId: 'acc-main-cash',
    date: '2026-09-14T10:00:00Z',
    shamsiDate: '1405/06/23',
    description: 'انتقال از بانک ملت به صندوق',
  });
  const res101 = validateJournal(s101);
  if (!res101.isValid) throw new Error('سناریو ۱۰.۱ رد شد: ' + res101.errors.join(', '));
  if (s101.lines.length !== 2 || s101.totalDebit !== 5_000_000n) throw new Error('مبالغ ۱۰.۱ هم‌خوان نیست');
  console.log('✅ سناریو ۱۰.۱ با موفقیت پاس شد.');

  // سناریو ۱۰.۲: پرداخت با کارمزد (۱٬۰۰۰٬۰۰۰ ریال + ۱۰٬۰۰۰ ریال کارمزد)
  console.log('\n--- سناریو ۱۰.۲: پرداخت با کارمزد ---');
  const s102 = convertLegacyTransaction({
    id: 'tx-102',
    type: 'expense',
    amount: 1_000_000,
    fee: 10_000,
    fromAccountId: 'acc-bank-mellat',
    toAccountId: 'acc-person-ali',
    date: '2026-09-14T11:00:00Z',
    shamsiDate: '1405/06/23',
    description: 'پرداخت به علی با کارمزد ساتنا',
    trackingNumber: 'TR-987654',
  });
  const res102 = validateJournal(s102);
  if (!res102.isValid) throw new Error('سناریو ۱۰.۲ رد شد: ' + res102.errors.join(', '));
  if (s102.lines.length !== 3 || s102.totalDebit !== 1_010_000n) throw new Error('مبالغ ۱۰.۲ هم‌خوان نیست');
  const sourceLine = s102.lines.find((l) => l.lineRole === 'SOURCE');
  const feeLine = s102.lines.find((l) => l.lineRole === 'FEE');
  if (sourceLine?.amount !== 1_010_000n || feeLine?.amount !== 10_000n) throw new Error('تخصیص نقش سطرهای ۱۰.۲ ایراد دارد');
  console.log('✅ سناریو ۱۰.۲ با موفقیت پاس شد.');

  // سناریو کدگذاری خودکار حساب‌ها
  console.log('\n--- تست کدگذاری سلسله‌مراتبی خودکار ---');
  const child1 = generateAccountCode('10101', 3, []);
  if (child1 !== '10101001') throw new Error('کد فرزند اول اشتباه است: ' + child1);
  const child2 = generateAccountCode('10101', 3, ['10101001']);
  if (child2 !== '10101002') throw new Error('کد فرزند دوم اشتباه است: ' + child2);
  const subMoen = generateAccountCode('101', 2, ['10101', '10102']);
  if (subMoen !== '10103') throw new Error('کد معین سوم اشتباه است: ' + subMoen);
  console.log('✅ الگوریتم تولید خودکار کدینگ حساب‌ها پاس شد: 10101001, 10101002, 10103');

  // تست منفی: سند ناتراز باید رد شود
  console.log('\n--- تست منفی: رد سند ناتراز ---');
  const badJournal: JournalDto = {
    id: 'tx-bad',
    companyId: 'comp-1',
    fiscalYearId: 'fy-1405',
    fiscalPeriodId: 'fp-1',
    date: new Date(),
    jalaliYear: 1405,
    jalaliMonth: 6,
    jalaliDay: 23,
    kind: 'TRANSACTION',
    status: 'POSTED',
    totalDebit: 1000n,
    totalCredit: 800n,
    lineCount: 2,
    lines: [
      { id: 'l1', lineNo: 1, accountId: 'a1', side: 'DEBIT', amount: 1000n, lineRole: 'MAIN' },
      { id: 'l2', lineNo: 2, accountId: 'a2', side: 'CREDIT', amount: 800n, lineRole: 'MAIN' },
    ],
  };
  const resBad = validateJournal(badJournal);
  if (resBad.isValid) throw new Error('سند ناتراز باید رد می‌شد ولی شد!');
  console.log('✅ سند ناتراز با موفقیت کشف و رد شد: ' + resBad.errors[0]);

  console.log('\n========================================');
  console.log('🎉 تمام تست‌های طلایی موتور مالی پاس شدند!');
  console.log('========================================');
}

// اگر مستقیماً اجرا شد:
runAllScenarios();
