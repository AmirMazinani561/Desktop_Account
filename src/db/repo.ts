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
  status: 'DRAFT' | 'POSTED' | 'VOID';
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

  // ساختار حداقلی و تمیز اولیه (کاربر هر حسابی بخواهد خودش اضافه می‌کند)
  const accounts: Account[] = [
    // گروه ۱: دارایی‌ها
    {
      id: 'acc-g-1',
      companyId: DEFAULT_COMPANY_ID,
      parentId: null,
      path: '/acc-g-1/',
      depth: 1,
      accountClass: 'ASSET',
      accountKind: 'OTHER',
      code: '1',
      codingLevel: 1,
      isPostable: false,
      name: 'دارایی‌ها',
      icon: null,
      color: null,
      isFavorite: false,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // کل ۱۰۱: نقد و بانک
    {
      id: 'acc-k-101',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-g-1',
      path: '/acc-g-1/acc-k-101/',
      depth: 2,
      accountClass: 'ASSET',
      accountKind: 'OTHER',
      code: '101',
      codingLevel: 2,
      isPostable: false,
      name: 'موجودی نقد و بانک',
      icon: null,
      color: null,
      isFavorite: false,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // معین ۱۰۱۰۱: صندوق‌ها
    {
      id: 'acc-m-10101',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-k-101',
      path: '/acc-g-1/acc-k-101/acc-m-10101/',
      depth: 3,
      accountClass: 'ASSET',
      accountKind: 'CASH',
      code: '10101',
      codingLevel: 3,
      isPostable: false,
      name: 'صندوق‌ها',
      icon: 'wallet',
      color: '#10B981',
      isFavorite: false,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // تفصیلی ۱۰۱۰۱۰۰۱: صندوق اصلی
    {
      id: 'acc-d-10101001',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-m-10101',
      path: '/acc-g-1/acc-k-101/acc-m-10101/acc-d-10101001/',
      depth: 4,
      accountClass: 'ASSET',
      accountKind: 'CASH',
      code: '10101001',
      codingLevel: 4,
      isPostable: true,
      name: 'صندوق اصلی',
      icon: 'wallet',
      color: '#10B981',
      isFavorite: true,
      openingBalance: '25000000', // ۲۵ میلیون ریال موجودی اولیه
      openingSide: 'DEBIT',
      isSystem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // معین ۱۰۱۰۲: بانک‌ها
    {
      id: 'acc-m-10102',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-k-101',
      path: '/acc-g-1/acc-k-101/acc-m-10102/',
      depth: 3,
      accountClass: 'ASSET',
      accountKind: 'BANK',
      code: '10102',
      codingLevel: 3,
      isPostable: false,
      name: 'بانک‌ها',
      icon: 'landmark',
      color: '#3B82F6',
      isFavorite: false,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // تفصیلی ۱۰۱۰۲۰۰۱: بانک ملی
    {
      id: 'acc-d-10102001',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-m-10102',
      path: '/acc-g-1/acc-k-101/acc-m-10102/acc-d-10102001/',
      depth: 4,
      accountClass: 'ASSET',
      accountKind: 'BANK',
      code: '10102001',
      codingLevel: 4,
      isPostable: true,
      name: 'بانک ملی (جاری)',
      icon: 'landmark',
      color: '#3B82F6',
      isFavorite: true,
      openingBalance: '150000000', // ۱۵۰ میلیون ریال موجودی اولیه
      openingSide: 'DEBIT',
      isSystem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // کل ۱۰۲: اشخاص
    {
      id: 'acc-k-102',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-g-1',
      path: '/acc-g-1/acc-k-102/',
      depth: 2,
      accountClass: 'ASSET',
      accountKind: 'PERSON',
      code: '102',
      codingLevel: 2,
      isPostable: false,
      name: 'اشخاص و طرف‌حساب‌ها',
      icon: 'users',
      color: '#8B5CF6',
      isFavorite: false,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // تفصیلی ۱۰۲۰۱۰۰۱: شخص نمونه
    {
      id: 'acc-d-10201001',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-k-102',
      path: '/acc-g-1/acc-k-102/acc-d-10201001/',
      depth: 3,
      accountClass: 'ASSET',
      accountKind: 'PERSON',
      code: '10201001',
      codingLevel: 3,
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
    // گروه ۴: درآمدها
    {
      id: 'acc-g-4',
      companyId: DEFAULT_COMPANY_ID,
      parentId: null,
      path: '/acc-g-4/',
      depth: 1,
      accountClass: 'INCOME',
      accountKind: 'INCOME_HEADING',
      code: '4',
      codingLevel: 1,
      isPostable: false,
      name: 'درآمدها',
      icon: 'trending-up',
      color: '#10B981',
      isFavorite: false,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // تفصیلی ۴۰۱۰۱۰۰۱: حقوق و دستمزد
    {
      id: 'acc-d-40101001',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-g-4',
      path: '/acc-g-4/acc-d-40101001/',
      depth: 2,
      accountClass: 'INCOME',
      accountKind: 'INCOME_HEADING',
      code: '40101001',
      codingLevel: 2,
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
    // گروه ۵: هزینه‌ها
    {
      id: 'acc-g-5',
      companyId: DEFAULT_COMPANY_ID,
      parentId: null,
      path: '/acc-g-5/',
      depth: 1,
      accountClass: 'EXPENSE',
      accountKind: 'EXPENSE_HEADING',
      code: '5',
      codingLevel: 1,
      isPostable: false,
      name: 'هزینه‌ها',
      icon: 'trending-down',
      color: '#EF4444',
      isFavorite: false,
      openingBalance: '0',
      openingSide: 'DEBIT',
      isSystem: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // تفصیلی ۵۰۱۰۱۰۰۱: خوراک و اقلام روزمره
    {
      id: 'acc-d-50101001',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-g-5',
      path: '/acc-g-5/acc-d-50101001/',
      depth: 2,
      accountClass: 'EXPENSE',
      accountKind: 'EXPENSE_HEADING',
      code: '50101001',
      codingLevel: 2,
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
    // تفصیلی ۵۰۱۰۲۰۰۱: مسکن و شارژ
    {
      id: 'acc-d-50102001',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-g-5',
      path: '/acc-g-5/acc-d-50102001/',
      depth: 2,
      accountClass: 'EXPENSE',
      accountKind: 'EXPENSE_HEADING',
      code: '50102001',
      codingLevel: 2,
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
    // تفصیلی ۵۰۱۰۸۰۰۱: کارمزد بانکی
    {
      id: 'acc-d-50108001',
      companyId: DEFAULT_COMPANY_ID,
      parentId: 'acc-g-5',
      path: '/acc-g-5/acc-d-50108001/',
      depth: 2,
      accountClass: 'EXPENSE',
      accountKind: 'EXPENSE_HEADING',
      code: '50108001',
      codingLevel: 2,
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
 * تولید کد خودکار حساب‌ها بر اساس والد و کلاس (مطابق با fn_next_account_code)
 */
export function generateNextAccountCode(
  parentAccount: Account | null,
  accountClass: Account['accountClass'],
  existingAccounts: Account[]
): string {
  if (!parentAccount) {
    const classPrefix =
      accountClass === 'ASSET'
        ? '1'
        : accountClass === 'LIABILITY'
        ? '2'
        : accountClass === 'EQUITY'
        ? '3'
        : accountClass === 'INCOME'
        ? '4'
        : '5';

    const rootCodes = existingAccounts
      .filter((a) => a.parentId === null && a.code.startsWith(classPrefix))
      .map((a) => parseInt(a.code, 10))
      .filter((n) => !isNaN(n));

    if (rootCodes.length === 0) return classPrefix;
    return (Math.max(...rootCodes) + 1).toString();
  }

  const parentCode = parentAccount.code;
  const padLen = parentAccount.depth <= 2 ? 2 : 3;

  const siblingCodes = existingAccounts
    .filter((a) => a.parentId === parentAccount.id && a.code.startsWith(parentCode))
    .map((a) => {
      const suffix = a.code.slice(parentCode.length);
      return parseInt(suffix, 10);
    })
    .filter((n) => !isNaN(n));

  const nextNum = siblingCodes.length === 0 ? 1 : Math.max(...siblingCodes) + 1;
  return `${parentCode}${nextNum.toString().padStart(padLen, '0')}`;
}

/**
 * محاسبه لحظه‌ای مانده هر حساب
 */
export function calculateAccountBalances(store: DataStore): Map<string, bigint> {
  const balances = new Map<string, bigint>();

  // شروع از موجودی اولیه
  for (const acc of store.accounts) {
    const opening = BigInt(acc.openingBalance || '0');
    balances.set(acc.id, opening);
  }

  // اعمال خطوط سند ثبت‌شده
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
      // LIABILITY, EQUITY, INCOME
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

  // نقد و بانک (صندوق + بانک‌ها)
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

  // درآمد و هزینه ماه جاری
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
        sourceName: srcAcc ? srcAcc.name : 'نامشخص',
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

  const parent = data.parentId ? store.accounts.find((a) => a.id === data.parentId) || null : null;
  const depth = parent ? parent.depth + 1 : 1;
  const pathStr = parent ? `${parent.path}acc-${Date.now()}/` : `/acc-${Date.now()}/`;

  // تولید خودکار کد در صورت وارد نشدن
  const code = data.code?.trim() || generateNextAccountCode(parent, data.accountClass, store.accounts);

  const newAccount: Account = {
    id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId: DEFAULT_COMPANY_ID,
    parentId: parent ? parent.id : null,
    path: pathStr,
    depth,
    accountClass: data.accountClass,
    accountKind: data.accountKind,
    code,
    codingLevel: depth,
    isPostable: true,
    name: data.name.trim(),
    icon: data.icon || (data.accountClass === 'INCOME' ? 'trending-up' : data.accountClass === 'EXPENSE' ? 'trending-down' : 'wallet'),
    color: data.color || (data.accountClass === 'INCOME' ? '#10B981' : data.accountClass === 'EXPENSE' ? '#EF4444' : '#3B82F6'),
    isFavorite: !!data.isFavorite,
    openingBalance: data.initialBalance ? BigInt(Math.round(Number(data.initialBalance))).toString() : '0',
    openingSide: data.accountClass === 'ASSET' || data.accountClass === 'EXPENSE' ? 'DEBIT' : 'CREDIT',
    isSystem: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.accounts.push(newAccount);
  saveStore(store);

  return newAccount;
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

  // بررسی گردش
  const hasActivity = store.journalLines.some((l) => l.accountId === id);
  if (hasActivity) {
    throw new Error('حساب دارای تراکنش و گردش مالی است و قابل حذف نیست (می‌توانید آن را غیرفعال کنید).');
  }

  // بررسی زیرحساب
  const hasChildren = store.accounts.some((a) => a.parentId === id);
  if (hasChildren) {
    throw new Error('این حساب دارای زیرمجموعه است و ابتدا باید زیرحساب‌های آن حذف شوند.');
  }

  store.accounts.splice(accIndex, 1);
  saveStore(store);
  return { success: true };
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

  // محاسبه تاریخ شمسی
  let dateDetails;
  if (data.shamsiDate) {
    const parsed = parseJalali(data.shamsiDate);
    // ساخت Date
    dateDetails = fromDate(new Date(Date.UTC(parsed.jy > 1000 ? parsed.jy + 621 : 2026, parsed.jm - 1, parsed.jd)));
    // اصلاح فیلدهای شمسی از مقدار دقیق پارس‌شده
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

  // سطر ۱: بستانکار حساب مبدأ
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

  // سطر ۲: بدهکار حساب مقصد
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

  // سطر ۳: کارمزد بانکی (در صورت وجود)
  if (feeBig > 0n) {
    let feeAcc = store.accounts.find((a) => a.code === '50108001' || a.name.includes('کارمزد'));
    if (!feeAcc) {
      feeAcc = srcAcc;
    }
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

export function voidTransaction(journalId: string, reason: string) {
  const store = loadStore();
  const journal = store.journals.find((j) => j.id === journalId);

  if (!journal) {
    throw new Error('سند مورد نظر پیدا نشد.');
  }
  if (journal.status === 'VOID') {
    throw new Error('این سند قبلاً باطل شده است.');
  }

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
