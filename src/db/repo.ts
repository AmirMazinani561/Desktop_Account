// =============================================================================
//  src/db/repo.ts — مخزن داده‌های موتور مالی (Data Repository)
//  سند بالادستی: DATA_MODEL.md نسخه ۰.۴ • PRD.md نسخه ۰.۵
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fromDate, parseJalali, formatJalali } from '../../lib/jalali';

export interface Account {
  id: string;
  companyId: string;
  parentId: string | null;
  path: string;
  depth: number;
  accountClass: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  accountKind: 'BANK' | 'CASH' | 'PERSON' | 'INCOME_HEADING' | 'EXPENSE_HEADING' | 'CONTROL' | 'OTHER';
  code: string;
  codingLevel: number;
  isPostable: boolean;
  name: string;
  icon: string | null;
  color: string | null;
  isFavorite: boolean;
  openingBalance: string; // BigInt as string
  openingSide: 'DEBIT' | 'CREDIT';
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currentBalance?: string; // Calculated
}

export interface JournalLine {
  id: string;
  journalId: string;
  companyId: string;
  lineNo: number;
  accountId: string;
  accountName?: string;
  side: 'DEBIT' | 'CREDIT';
  amount: string; // BigInt as string
  lineRole: 'SOURCE' | 'DESTINATION' | 'FEE' | 'PRINCIPAL' | 'INTEREST' | 'TAX' | 'DISCOUNT' | 'COGS' | 'MAIN';
  description: string | null;
  fiscalPeriodId: string;
  jalaliYear: number;
  jalaliMonth: number;
}

export interface Journal {
  id: string;
  companyId: string;
  fiscalYearId: string;
  fiscalPeriodId: string;
  serialNo: string; // BigInt as string
  date: string; // YYYY-MM-DD
  jalaliYear: number;
  jalaliMonth: number;
  jalaliDay: number;
  formattedJalali: string;
  description: string | null;
  kind: 'TRANSACTION' | 'RECURRING' | 'SMS' | 'IMPORT' | 'MANUAL' | 'INVOICE' | 'CHECK';
  status: 'POSTED' | 'VOID';
  totalDebit: string;
  totalCredit: string;
  lineCount: number;
  refNo: string | null;
  refKind: string | null;
  sourceType: string | null;
  sourceId: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
  lines: JournalLine[];
}

export interface Company {
  id: string;
  name: string;
  baseUnit: 'RIAL' | 'TOMAN';
  calendar: 'JALALI';
}

export interface FiscalYear {
  id: string;
  companyId: string;
  jalaliYear: number;
  title: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
}

export interface DataStore {
  company: Company;
  fiscalYear: FiscalYear;
  accounts: Account[];
  journals: Journal[];
  journalLines: JournalLine[];
  serialCounter: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';
const DEFAULT_FY_ID = 'fy-1405-0000-0000-0000-000000000001';

function getDefaultStore(): DataStore {
  const company: Company = {
    id: DEFAULT_COMPANY_ID,
    name: 'حسابداری شخصی و کسب‌وکار من',
    baseUnit: 'RIAL',
    calendar: 'JALALI',
  };

  const fiscalYear: FiscalYear = {
    id: DEFAULT_FY_ID,
    companyId: DEFAULT_COMPANY_ID,
    jalaliYear: 1405,
    title: 'سال مالی ۱۴۰۵',
    startDate: '2026-03-21',
    endDate: '2027-03-20',
    status: 'OPEN',
  };

  // کدهای تمیز و کوتاه (شروع از ۱ برای هر دسته بندی)
  const accounts: Account[] = [
    // صندوق اصلی (کد ۱)
    {
      id: 'acc-cash-1',
      companyId: DEFAULT_COMPANY_ID,
      parentId: null,
      path: '/acc-cash-1/',
      depth: 1,
      accountClass: 'ASSET',
      accountKind: 'CASH',
      code: '1',
      codingLevel: 1,
      isPostable: true,
      name: 'صندوق اصلی',
      icon: 'wallet',
      color: '#10B981',
      isFavorite: true,
      openingBalance: '25000000', // ۲۵ میلیون ریال
      openingSide: 'DEBIT',
      isSystem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // بانک ملی (کد ۲)
    {
      id: 'acc-bank-1',
      companyId: DEFAULT_COMPANY_ID,
      parentId: null,
      path: '/acc-bank-1/',
      depth: 1,
      accountClass: 'ASSET',
      accountKind: 'BANK',
      code: '2',
      codingLevel: 1,
      isPostable: true,
      name: 'بانک ملی (جاری)',
      icon: 'landmark',
      color: '#3B82F6',
      isFavorite: true,
      openingBalance: '150000000', // ۱۵۰ میلیون ریال
      openingSide: 'DEBIT',
      isSystem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // شخص نمونه (کد ۳)
    {
      id: 'acc-person-1',
      companyId: DEFAULT_COMPANY_ID,
      parentId: null,
      path: '/acc-person-1/',
      depth: 1,
      accountClass: 'ASSET',
      accountKind: 'PERSON',
      code: '3',
      codingLevel: 1,
      isPostable: true,
      name: 'علی محمدی',
      icon: 'user',
      color: '#8B5CF6',
      isFavorite: false,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // حقوق و دستمزد (کد ۱۰)
    {
      id: 'acc-inc-1',
      companyId: DEFAULT_COMPANY_ID,
      parentId: null,
      path: '/acc-inc-1/',
      depth: 1,
      accountClass: 'INCOME',
      accountKind: 'INCOME_HEADING',
      code: '10',
      codingLevel: 1,
      isPostable: true,
      name: 'حقوق و دستمزد',
      icon: 'briefcase',
      color: '#10B981',
      isFavorite: true,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // خوراک و اقلام روزمره (کد ۲۰)
    {
      id: 'acc-exp-1',
      companyId: DEFAULT_COMPANY_ID,
      parentId: null,
      path: '/acc-exp-1/',
      depth: 1,
      accountClass: 'EXPENSE',
      accountKind: 'EXPENSE_HEADING',
      code: '20',
      codingLevel: 1,
      isPostable: true,
      name: 'خوراک و اقلام روزمره',
      icon: 'utensils',
      color: '#EF4444',
      isFavorite: true,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // مسکن و شارژ (کد ۲۱)
    {
      id: 'acc-exp-2',
      companyId: DEFAULT_COMPANY_ID,
      parentId: null,
      path: '/acc-exp-2/',
      depth: 1,
      accountClass: 'EXPENSE',
      accountKind: 'EXPENSE_HEADING',
      code: '21',
      codingLevel: 1,
      isPostable: true,
      name: 'مسکن، اجاره و شارژ',
      icon: 'home',
      color: '#F59E0B',
      isFavorite: true,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // کارمزد بانکی (کد ۲۹)
    {
      id: 'acc-exp-fee',
      companyId: DEFAULT_COMPANY_ID,
      parentId: null,
      path: '/acc-exp-fee/',
      depth: 1,
      accountClass: 'EXPENSE',
      accountKind: 'EXPENSE_HEADING',
      code: '29',
      codingLevel: 1,
      isPostable: true,
      name: 'کارمزد بانکی',
      icon: 'credit-card',
      color: '#64748B',
      isFavorite: false,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    company,
    fiscalYear,
    accounts,
    journals: [],
    journalLines: [],
    serialCounter: 0,
  };
}

function loadStore(): DataStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error loading store file:', err);
  }
  const defaultStore = getDefaultStore();
  saveStore(defaultStore);
  return defaultStore;
}

function saveStore(store: DataStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving store file:', err);
  }
}

/**
 * تولید خودکار کدهای تمیز و کوتاه (مثلاً برای بانک/صندوق: ۱، ۲، ۳... یا بر اساس نوع)
 */
export function generateNextAccountCode(
  accountKind: Account['accountKind'],
  accountClass: Account['accountClass'],
  existingAccounts: Account[]
): string {
  // اگر بانک یا صندوق است: کدهای عددی ۱ تا ۹
  let baseStart = 1;
  if (accountKind === 'PERSON') baseStart = 5;
  if (accountClass === 'INCOME') baseStart = 10;
  if (accountClass === 'EXPENSE') baseStart = 20;

  const codes = existingAccounts
    .map((a) => parseInt(a.code, 10))
    .filter((n) => !isNaN(n));

  let candidate = baseStart;
  while (codes.includes(candidate)) {
    candidate += 1;
  }

  return candidate.toString();
}

/**
 * محاسبه لحظه‌ای مانده هر حساب
 */
export function calculateAccountBalances(store: DataStore): Map<string, bigint> {
  const balances = new Map<string, bigint>();

  // موجودی اولیه
  for (const acc of store.accounts) {
    const opening = BigInt(acc.openingBalance || '0');
    balances.set(acc.id, opening);
  }

  // گردش خطوط اسناد ثبت‌شده
  for (const line of store.journalLines) {
    const journal = store.journals.find((j) => j.id === line.journalId);
    if (!journal || journal.status !== 'POSTED') continue;

    const acc = store.accounts.find((a) => a.id === line.accountId);
    if (!acc) continue;

    const current = balances.get(line.accountId) || 0n;
    const amount = BigInt(line.amount);

    if (acc.accountClass === 'ASSET' || acc.accountClass === 'EXPENSE') {
      if (line.side === 'DEBIT') {
        balances.set(line.accountId, current + amount);
      } else {
        balances.set(line.accountId, current - amount);
      }
    } else {
      if (line.side === 'CREDIT') {
        balances.set(line.accountId, current + amount);
      } else {
        balances.set(line.accountId, current - amount);
      }
    }
  }

  return balances;
}

// -----------------------------------------------------------------------------
// توابع عمومی API
// -----------------------------------------------------------------------------

export function getDashboardData() {
  const store = loadStore();
  const balances = calculateAccountBalances(store);

  let totalCashAndBank = 0n;
  const cashAndBankAccounts: Account[] = [];

  for (const acc of store.accounts) {
    const bal = balances.get(acc.id) || 0n;
    acc.currentBalance = bal.toString();

    if (acc.accountKind === 'CASH' || acc.accountKind === 'BANK') {
      if (acc.isPostable) {
        totalCashAndBank += bal;
        cashAndBankAccounts.push(acc);
      }
    }
  }

  const todayDetails = fromDate(new Date());
  let currentMonthIncome = 0n;
  let currentMonthExpense = 0n;

  for (const line of store.journalLines) {
    const j = store.journals.find((x) => x.id === line.journalId);
    if (!j || j.status !== 'POSTED') continue;

    if (j.jalaliYear === todayDetails.jy && j.jalaliMonth === todayDetails.jm) {
      const acc = store.accounts.find((a) => a.id === line.accountId);
      if (!acc) continue;

      if (acc.accountClass === 'INCOME' && line.side === 'CREDIT') {
        currentMonthIncome += BigInt(line.amount);
      } else if (acc.accountClass === 'EXPENSE' && line.side === 'DEBIT') {
        currentMonthExpense += BigInt(line.amount);
      }
    }
  }

  const recentJournals = store.journals
    .filter((j) => j.status === 'POSTED')
    .slice(-10)
    .reverse()
    .map((j) => {
      const srcLine = j.lines.find((l) => l.lineRole === 'SOURCE');
      const dstLine = j.lines.find((l) => l.lineRole === 'DESTINATION');
      const feeLine = j.lines.find((l) => l.lineRole === 'FEE');

      const srcAcc = store.accounts.find((a) => a.id === srcLine?.accountId);
      const dstAcc = store.accounts.find((a) => a.id === dstLine?.accountId);

      return {
        id: j.id,
        serialNo: j.serialNo,
        date: j.date,
        formattedJalali: j.formattedJalali,
        description: j.description || 'بدون شرح',
        refNo: j.refNo,
        amount: dstLine ? dstLine.amount : j.totalDebit,
        fee: feeLine ? feeLine.amount : '0',
        sourceAccountId: srcAcc?.id,
        sourceName: srcAcc ? srcAcc.name : 'نامشخص',
        destinationAccountId: dstAcc?.id,
        destinationName: dstAcc ? dstAcc.name : 'نامشخص',
        kind: j.kind,
      };
    });

  return {
    company: store.company,
    todayJalali: todayDetails.formattedJalali,
    monthName: todayDetails.monthName,
    totalCashAndBank: totalCashAndBank.toString(),
    currentMonthIncome: currentMonthIncome.toString(),
    currentMonthExpense: currentMonthExpense.toString(),
    cashAndBankAccounts,
    recentTransactions: recentJournals,
    accountsCount: store.accounts.filter((a) => a.isPostable).length,
    transactionsCount: store.journals.filter((j) => j.status === 'POSTED').length,
  };
}

export function getAllAccounts() {
  const store = loadStore();
  const balances = calculateAccountBalances(store);

  return store.accounts.map((acc) => ({
    ...acc,
    currentBalance: (balances.get(acc.id) || 0n).toString(),
  }));
}

export function createNewAccount(data: {
  name: string;
  accountClass: Account['accountClass'];
  accountKind: Account['accountKind'];
  parentId?: string | null;
  code?: string;
  initialBalance?: string;
  icon?: string;
  color?: string;
  isFavorite?: boolean;
}) {
  const store = loadStore();

  const code =
    data.code?.trim() ||
    generateNextAccountCode(data.accountKind, data.accountClass, store.accounts);

  const newAccount: Account = {
    id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId: DEFAULT_COMPANY_ID,
    parentId: data.parentId || null,
    path: `/acc-${Date.now()}/`,
    depth: 1,
    accountClass: data.accountClass,
    accountKind: data.accountKind,
    code,
    codingLevel: 1,
    isPostable: true,
    name: data.name.trim(),
    icon:
      data.icon ||
      (data.accountClass === 'INCOME'
        ? 'trending-up'
        : data.accountClass === 'EXPENSE'
        ? 'trending-down'
        : data.accountKind === 'PERSON'
        ? 'user'
        : 'wallet'),
    color:
      data.color ||
      (data.accountClass === 'INCOME'
        ? '#10B981'
        : data.accountClass === 'EXPENSE'
        ? '#EF4444'
        : data.accountKind === 'PERSON'
        ? '#8B5CF6'
        : '#3B82F6'),
    isFavorite: data.isFavorite !== undefined ? data.isFavorite : true,
    openingBalance: data.initialBalance ? BigInt(Math.round(Number(data.initialBalance))).toString() : '0',
    openingSide:
      data.accountClass === 'ASSET' || data.accountClass === 'EXPENSE' ? 'DEBIT' : 'CREDIT',
    isSystem: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.accounts.push(newAccount);
  saveStore(store);

  return newAccount;
}

export function updateAccount(
  id: string,
  data: {
    name?: string;
    code?: string;
    color?: string;
    icon?: string;
    isFavorite?: boolean;
    initialBalance?: string;
  }
) {
  const store = loadStore();
  const acc = store.accounts.find((a) => a.id === id);

  if (!acc) throw new Error('حساب مورد نظر پیدا نشد.');

  if (data.name) acc.name = data.name.trim();
  if (data.code) acc.code = data.code.trim();
  if (data.color) acc.color = data.color;
  if (data.icon) acc.icon = data.icon;
  if (data.isFavorite !== undefined) acc.isFavorite = data.isFavorite;
  if (data.initialBalance !== undefined) {
    acc.openingBalance = BigInt(Math.round(Number(data.initialBalance) || 0)).toString();
  }
  acc.updatedAt = new Date().toISOString();

  saveStore(store);
  return acc;
}

export function deleteAccountById(id: string) {
  const store = loadStore();
  const accIndex = store.accounts.findIndex((a) => a.id === id);

  if (accIndex === -1) {
    throw new Error('حساب مورد نظر پیدا نشد.');
  }

  const acc = store.accounts[accIndex];
  if (acc.isSystem) {
    throw new Error('حساب‌های سیستمی قابل حذف نیستند.');
  }

  const hasActivity = store.journalLines.some((l) => l.accountId === id);
  if (hasActivity) {
    throw new Error('حساب دارای تراکنش و گردش مالی است و قابل حذف نیست (می‌توانید آن را غیرفعال کنید).');
  }

  store.accounts.splice(accIndex, 1);
  saveStore(store);
  return { success: true };
}

/**
 * گزارش گردش حساب (Account Ledger Statement) با ماندهٔ لحظه‌ای
 */
export function getAccountLedger(accountId: string) {
  const store = loadStore();
  const acc = store.accounts.find((a) => a.id === accountId);
  if (!acc) throw new Error('حساب پیدا نشد.');

  const openingBal = BigInt(acc.openingBalance || '0');
  let running = openingBal;

  const entries: any[] = [];

  // ورودی موجودی اولیه
  if (openingBal > 0n) {
    entries.push({
      id: 'opening',
      serialNo: '—',
      date: 'افتتاحیه',
      formattedJalali: 'موجودی اولیه',
      description: 'موجودی اولیه حساب',
      counterAccountName: 'سند افتتاحیه',
      debit: acc.openingSide === 'DEBIT' ? openingBal.toString() : '0',
      credit: acc.openingSide === 'CREDIT' ? openingBal.toString() : '0',
      runningBalance: running.toString(),
      refNo: null,
    });
  }

  // گردش خطوط
  for (const line of store.journalLines) {
    if (line.accountId !== accountId) continue;
    const j = store.journals.find((x) => x.id === line.journalId);
    if (!j || j.status !== 'POSTED') continue;

    const amount = BigInt(line.amount);

    if (acc.accountClass === 'ASSET' || acc.accountClass === 'EXPENSE') {
      if (line.side === 'DEBIT') running += amount;
      else running -= amount;
    } else {
      if (line.side === 'CREDIT') running += amount;
      else running -= amount;
    }

    // پیدا کردن حساب مقابل
    const otherLine = j.lines.find((l) => l.id !== line.id && l.lineRole !== 'FEE');
    const otherAcc = store.accounts.find((a) => a.id === otherLine?.accountId);

    entries.push({
      id: line.id,
      journalId: j.id,
      serialNo: j.serialNo,
      date: j.date,
      formattedJalali: j.formattedJalali,
      description: line.description || j.description || 'بدون شرح',
      counterAccountName: otherAcc ? otherAcc.name : 'سایر حساب‌ها',
      debit: line.side === 'DEBIT' ? amount.toString() : '0',
      credit: line.side === 'CREDIT' ? amount.toString() : '0',
      runningBalance: running.toString(),
      refNo: j.refNo,
    });
  }

  return {
    account: {
      ...acc,
      currentBalance: running.toString(),
    },
    entries,
    totalDebit: entries.reduce((s, e) => s + BigInt(e.debit || 0), 0n).toString(),
    totalCredit: entries.reduce((s, e) => s + BigInt(e.credit || 0), 0n).toString(),
    finalBalance: running.toString(),
  };
}

export function createTransaction(data: {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string | number;
  fee?: string | number;
  shamsiDate?: string;
  description?: string;
  refNo?: string;
}) {
  const store = loadStore();

  const srcAcc = store.accounts.find((a) => a.id === data.sourceAccountId);
  const dstAcc = store.accounts.find((a) => a.id === data.destinationAccountId);

  if (!srcAcc || !dstAcc) {
    throw new Error('حساب مبدأ یا مقصد نامعتبر است.');
  }

  const amountBig = BigInt(Math.round(Number(data.amount)));
  if (amountBig <= 0n) {
    throw new Error('مبلغ تراکنش باید بزرگ‌تر از صفر باشد.');
  }

  const feeBig = data.fee ? BigInt(Math.round(Number(data.fee))) : 0n;

  let dateDetails;
  if (data.shamsiDate) {
    const parsed = parseJalali(data.shamsiDate);
    dateDetails = fromDate(new Date(Date.UTC(parsed.jy > 1000 ? parsed.jy + 621 : 2026, parsed.jm - 1, parsed.jd)));
    dateDetails.jy = parsed.jy;
    dateDetails.jm = parsed.jm;
    dateDetails.jd = parsed.jd;
    dateDetails.formattedJalali = formatJalali(parsed.jy, parsed.jm, parsed.jd);
  } else {
    dateDetails = fromDate(new Date());
  }

  store.serialCounter += 1;
  const serialNo = store.serialCounter.toString();

  const journalId = `j-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const lines: JournalLine[] = [];

  // سطر ۱: بستانکار مبدأ
  lines.push({
    id: `jl-${Date.now()}-1`,
    journalId,
    companyId: DEFAULT_COMPANY_ID,
    lineNo: 1,
    accountId: srcAcc.id,
    accountName: srcAcc.name,
    side: 'CREDIT',
    amount: (amountBig + feeBig).toString(),
    lineRole: 'SOURCE',
    description: data.description || null,
    fiscalPeriodId: `fp-${dateDetails.jy}-${dateDetails.jm}`,
    jalaliYear: dateDetails.jy,
    jalaliMonth: dateDetails.jm,
  });

  // سطر ۲: بدهکار مقصد
  lines.push({
    id: `jl-${Date.now()}-2`,
    journalId,
    companyId: DEFAULT_COMPANY_ID,
    lineNo: 2,
    accountId: dstAcc.id,
    accountName: dstAcc.name,
    side: 'DEBIT',
    amount: amountBig.toString(),
    lineRole: 'DESTINATION',
    description: data.description || null,
    fiscalPeriodId: `fp-${dateDetails.jy}-${dateDetails.jm}`,
    jalaliYear: dateDetails.jy,
    jalaliMonth: dateDetails.jm,
  });

  // سطر ۳: کارمزد بانکی
  if (feeBig > 0n) {
    let feeAcc = store.accounts.find((a) => a.code === '29' || a.name.includes('کارمزد'));
    if (!feeAcc) feeAcc = srcAcc;

    lines.push({
      id: `jl-${Date.now()}-3`,
      journalId,
      companyId: DEFAULT_COMPANY_ID,
      lineNo: 3,
      accountId: feeAcc.id,
      accountName: feeAcc.name,
      side: 'DEBIT',
      amount: feeBig.toString(),
      lineRole: 'FEE',
      description: 'کارمزد بانکی',
      fiscalPeriodId: `fp-${dateDetails.jy}-${dateDetails.jm}`,
      jalaliYear: dateDetails.jy,
      jalaliMonth: dateDetails.jm,
    });
  }

  const totalDebit = (amountBig + feeBig).toString();
  const totalCredit = (amountBig + feeBig).toString();

  const journal: Journal = {
    id: journalId,
    companyId: DEFAULT_COMPANY_ID,
    fiscalYearId: DEFAULT_FY_ID,
    fiscalPeriodId: `fp-${dateDetails.jy}-${dateDetails.jm}`,
    serialNo,
    date: dateDetails.formattedGregorian,
    jalaliYear: dateDetails.jy,
    jalaliMonth: dateDetails.jm,
    jalaliDay: dateDetails.jd,
    formattedJalali: dateDetails.formattedJalali,
    description: data.description || null,
    kind: 'TRANSACTION',
    status: 'POSTED',
    totalDebit,
    totalCredit,
    lineCount: lines.length,
    refNo: data.refNo || null,
    refKind: data.refNo ? 'BANK_TRACE' : null,
    sourceType: 'MANUAL',
    sourceId: null,
    voidReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lines,
  };

  store.journals.push(journal);
  store.journalLines.push(...lines);
  saveStore(store);

  return journal;
}

export function updateTransaction(
  journalId: string,
  data: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: string | number;
    fee?: string | number;
    shamsiDate?: string;
    description?: string;
    refNo?: string;
  }
) {
  const store = loadStore();
  const journal = store.journals.find((j) => j.id === journalId);
  if (!journal) throw new Error('سند پیدا نشد.');
  if (journal.status === 'VOID') throw new Error('سند باطل‌شده قابل ویرایش نیست.');

  const srcAcc = store.accounts.find((a) => a.id === data.sourceAccountId);
  const dstAcc = store.accounts.find((a) => a.id === data.destinationAccountId);
  if (!srcAcc || !dstAcc) throw new Error('حساب مبدأ یا مقصد نامعتبر است.');

  const amountBig = BigInt(Math.round(Number(data.amount)));
  if (amountBig <= 0n) throw new Error('مبلغ باید بزرگ‌تر از صفر باشد.');
  const feeBig = data.fee ? BigInt(Math.round(Number(data.fee))) : 0n;

  let dateDetails;
  if (data.shamsiDate) {
    const parsed = parseJalali(data.shamsiDate);
    dateDetails = fromDate(new Date(Date.UTC(parsed.jy > 1000 ? parsed.jy + 621 : 2026, parsed.jm - 1, parsed.jd)));
    dateDetails.jy = parsed.jy;
    dateDetails.jm = parsed.jm;
    dateDetails.jd = parsed.jd;
    dateDetails.formattedJalali = formatJalali(parsed.jy, parsed.jm, parsed.jd);
  } else {
    dateDetails = fromDate(new Date());
  }

  // حذف خطوط قدیمی
  store.journalLines = store.journalLines.filter((l) => l.journalId !== journalId);

  const lines: JournalLine[] = [];
  lines.push({
    id: `jl-${Date.now()}-1`,
    journalId,
    companyId: DEFAULT_COMPANY_ID,
    lineNo: 1,
    accountId: srcAcc.id,
    accountName: srcAcc.name,
    side: 'CREDIT',
    amount: (amountBig + feeBig).toString(),
    lineRole: 'SOURCE',
    description: data.description || null,
    fiscalPeriodId: `fp-${dateDetails.jy}-${dateDetails.jm}`,
    jalaliYear: dateDetails.jy,
    jalaliMonth: dateDetails.jm,
  });

  lines.push({
    id: `jl-${Date.now()}-2`,
    journalId,
    companyId: DEFAULT_COMPANY_ID,
    lineNo: 2,
    accountId: dstAcc.id,
    accountName: dstAcc.name,
    side: 'DEBIT',
    amount: amountBig.toString(),
    lineRole: 'DESTINATION',
    description: data.description || null,
    fiscalPeriodId: `fp-${dateDetails.jy}-${dateDetails.jm}`,
    jalaliYear: dateDetails.jy,
    jalaliMonth: dateDetails.jm,
  });

  if (feeBig > 0n) {
    let feeAcc = store.accounts.find((a) => a.code === '29' || a.name.includes('کارمزد'));
    if (!feeAcc) feeAcc = srcAcc;
    lines.push({
      id: `jl-${Date.now()}-3`,
      journalId,
      companyId: DEFAULT_COMPANY_ID,
      lineNo: 3,
      accountId: feeAcc.id,
      accountName: feeAcc.name,
      side: 'DEBIT',
      amount: feeBig.toString(),
      lineRole: 'FEE',
      description: 'کارمزد بانکی',
      fiscalPeriodId: `fp-${dateDetails.jy}-${dateDetails.jm}`,
      jalaliYear: dateDetails.jy,
      jalaliMonth: dateDetails.jm,
    });
  }

  journal.date = dateDetails.formattedGregorian;
  journal.jalaliYear = dateDetails.jy;
  journal.jalaliMonth = dateDetails.jm;
  journal.jalaliDay = dateDetails.jd;
  journal.formattedJalali = dateDetails.formattedJalali;
  journal.description = data.description || null;
  journal.refNo = data.refNo || null;
  journal.totalDebit = (amountBig + feeBig).toString();
  journal.totalCredit = (amountBig + feeBig).toString();
  journal.lineCount = lines.length;
  journal.updatedAt = new Date().toISOString();
  journal.lines = lines;

  store.journalLines.push(...lines);
  saveStore(store);

  return journal;
}

export function voidTransaction(journalId: string, reason: string) {
  const store = loadStore();
  const journal = store.journals.find((j) => j.id === journalId);

  if (!journal) throw new Error('سند مورد نظر پیدا نشد.');
  if (journal.status === 'VOID') throw new Error('این سند قبلاً باطل شده است.');

  journal.status = 'VOID';
  journal.voidReason = reason || 'ابطال توسط کاربر';
  journal.updatedAt = new Date().toISOString();

  saveStore(store);
  return { success: true, journal };
}

export function getAllJournals() {
  const store = loadStore();
  return store.journals.map((j) => ({
    ...j,
    lines: j.lines.map((l) => {
      const acc = store.accounts.find((a) => a.id === l.accountId);
      return {
        ...l,
        accountName: acc ? acc.name : 'نامشخص',
        accountCode: acc ? acc.code : '',
      };
    }),
  }));
}
