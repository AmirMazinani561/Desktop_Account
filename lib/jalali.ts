// =============================================================================
//  lib/jalali.ts — ماژول تبدیل قطعی تقویم شمسی/میلادی + ابزارهای متنی فارسی
//  سند بالادستی: PRD.md نسخه ۰.۵ • DATA_MODEL.md نسخه ۰.۴ • Agents.md
// =============================================================================
//  ویژگی‌ها:
//    ۱) پیاده‌سازی الگوریتم استاندارد بورکوفسکی (Borkowski) برای تبدیل قطعی تقویم
//    ۲) نرمال‌سازی کدپوینت‌های یونیکد فارسی طبق Agents.md (ی/ک/ارقام)
//    ۳) محاسبه دقیق سال‌های کبیسه و طول ماه‌های شمسی (۳۱، ۳۰، ۲۹/۳۰)
//    ۴) فرمت‌دهی، اعتبارسنجی و پارس رشته‌های تاریخ شمسی با تلورانس ارقام فارسی
// =============================================================================

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export interface DateDetails extends JalaliDate, GregorianDate {
  date: Date;
  formattedJalali: string;
  formattedGregorian: string;
  monthName: string;
  isLeapJalali: boolean;
}

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
  2262, 2324, 2394, 2456, 3178,
];

export const MIN_JALAALI_YEAR = BREAKS[0];
export const MAX_JALAALI_YEAR = BREAKS[BREAKS.length - 1] - 1;

function div(a: number, b: number): number {
  return ~~(a / b);
}

function mod(a: number, b: number): number {
  return a - ~~(a / b) * b;
}

/**
 * تبدیل ارقام فارسی و عربی به ارقام انگلیسی (ASCII 0-9)
 */
export function toEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u0660-\u0669]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48))
    .replace(/[\u06F0-\u06F9]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 48));
}

/**
 * تبدیل ارقام انگلیسی به فارسی (۰-۹) برای نمایش در UI
 */
export function toPersianDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 48 + 0x06F0));
}

/**
 * نرمال‌سازی حروف فارسی طبق استاندارد Agents.md:
 * تبدیل ي (U+064A / U+0649) به ی (U+06CC) و ك (U+0643) به ک (U+06A9)
 */
export function normalizePersianText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064A\u0649]/g, '\u06CC') // ي -> ی
    .replace(/[\u0643]/g, '\u06A9')       // ك -> ک
    .replace(/[\u064B-\u065F\u0670]/g, '') // حذف اعراب (تنوین، تشدید، کسره، ضمه، فتحه)
    .trim();
}

function jalCalCore(jy: number): { gy: number; march: number; jump: number; n: number } {
  if (!Number.isFinite(jy) || jy < MIN_JALAALI_YEAR || jy > MAX_JALAALI_YEAR) {
    throw new RangeError(`سال شمسی ${jy} خارج از بازهٔ معتبر [${MIN_JALAALI_YEAR}, ${MAX_JALAALI_YEAR}] است.`);
  }
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jm = 0;
  let jump = 0;
  for (let i = 1; i < BREAKS.length; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  const n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  return {
    gy,
    march: 20 + leapJ - leapG,
    jump,
    n,
  };
}

function leapFromCycle(jump: number, n: number): number {
  let adjusted = n;
  if (jump - n < 6) adjusted = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(adjusted + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return leap;
}

function jalCalLeap(jy: number): number {
  if (!Number.isFinite(jy) || jy < MIN_JALAALI_YEAR || jy > MAX_JALAALI_YEAR) {
    throw new RangeError(`سال شمسی ${jy} خارج از بازه معتبر است.`);
  }
  let jp = BREAKS[0];
  let jump = 0;
  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    jp = jm;
  }
  return leapFromCycle(jump, jy - jp);
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const { gy, march, jump, n } = jalCalCore(jy);
  return {
    leap: leapFromCycle(jump, n),
    gy,
    march,
  };
}

function jalCalShort(jy: number): { gy: number; march: number } {
  const { gy, march } = jalCalCore(jy);
  return { gy, march };
}

export function g2d(gy: number, gm: number, gd: number): number {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

export function d2g(jdn: number): GregorianDate {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  return {
    gy: div(j, 1461) - 100100 + div(8 - gm, 6),
    gm,
    gd,
  };
}

export function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCalShort(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

const FIRST_JALAALI_JDN = j2d(MIN_JALAALI_YEAR, 1, 1);
const LAST_JALAALI_JDN = j2d(MAX_JALAALI_YEAR, 12, 29);

export function d2j(jdn: number): JalaliDate {
  if (jdn < FIRST_JALAALI_JDN || jdn > LAST_JALAALI_JDN + 2) {
    throw new RangeError(`شماره روز ژولین ${jdn} خارج از محدودهٔ معتبر است.`);
  }
  const gy = d2g(jdn).gy;
  let jy = Math.min(gy - 621, MAX_JALAALI_YEAR);
  const r = jalCal(jy);
  let k = jdn - g2d(r.gy, 3, r.march);
  if (k >= 0) {
    if (k <= 185) {
      return {
        jy,
        jm: 1 + div(k, 31),
        jd: mod(k, 31) + 1,
      };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return {
    jy,
    jm: 7 + div(k, 30),
    jd: mod(k, 30) + 1,
  };
}

/**
 * تبدیل تاریخ میلادی به شمسی
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

/**
 * تبدیل تاریخ شمسی به میلادی
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  return d2g(j2d(jy, jm, jd));
}

/**
 * آیا سال شمسی کبیسه است؟
 */
export function isLeapJalaliYear(jy: number): boolean {
  return jalCalLeap(jy) === 0;
}

/**
 * تعداد روزهای ماه شمسی (۳۱ برای ۱ تا ۶، ۳۰ برای ۷ تا ۱۱، و ۲۹ یا ۳۰ برای اسفند)
 */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm < 1 || jm > 12) {
    throw new RangeError(`شماره ماه شمسی ${jm} نامعتبر است (باید بین ۱ تا ۱۲ باشد).`);
  }
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

/**
 * اعتبارسنجی تاریخ شمسی
 */
export function isValidJalaliDate(jy: number, jm: number, jd: number): boolean {
  return (
    Number.isInteger(jy) &&
    Number.isInteger(jm) &&
    Number.isInteger(jd) &&
    jy >= MIN_JALAALI_YEAR &&
    jy <= MAX_JALAALI_YEAR &&
    jm >= 1 &&
    jm <= 12 &&
    jd >= 1 &&
    jd <= jalaliMonthLength(jy, jm)
  );
}

/**
 * فرمت‌دهی تاریخ شمسی به صورت YYYY/MM/DD
 */
export function formatJalali(jy: number, jm: number, jd: number, separator = '/'): string {
  const mm = jm < 10 ? `0${jm}` : `${jm}`;
  const dd = jd < 10 ? `0${jd}` : `${jd}`;
  return `${jy}${separator}${mm}${separator}${dd}`;
}

/**
 * پارس رشته تاریخ شمسی (پشتیبانی از ارقام فارسی/عربی و جداکننده‌های مختلف)
 */
export function parseJalali(str: string): JalaliDate {
  if (!str) throw new Error('رشته تاریخ شمسی خالی است.');
  const normalized = toEnglishDigits(str).trim();
  const parts = normalized.split(/[\/\-\.\s]/).filter(Boolean);

  if (parts.length !== 3) {
    throw new Error(`قالب تاریخ شمسی نامعتبر است: "${str}" (قالب مورد انتظار: 1405/06/23)`);
  }

  const jy = parseInt(parts[0], 10);
  const jm = parseInt(parts[1], 10);
  const jd = parseInt(parts[2], 10);

  if (isNaN(jy) || isNaN(jm) || isNaN(jd)) {
    throw new Error(`اجزای تاریخ شمسی عددی نیستند: "${str}"`);
  }
  if (!isValidJalaliDate(jy, jm, jd)) {
    throw new Error(`تاریخ شمسی ${jy}/${jm}/${jd} از نظر تقویمی نامعتبر است.`);
  }

  return { jy, jm, jd };
}

/**
 * دریافت جزئیات تاریخ از شیء Date یا رشته تاریخ ISO
 */
export function fromDate(input: Date | string): DateDetails {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) {
    throw new Error(`تاریخ ورودی نامعتبر است: ${input}`);
  }

  const gy = d.getUTCFullYear();
  const gm = d.getUTCMonth() + 1;
  const gd = d.getUTCDate();

  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
  const formattedJalali = formatJalali(jy, jm, jd);
  const formattedGregorian = `${gy}-${gm < 10 ? '0' + gm : gm}-${gd < 10 ? '0' + gd : gd}`;

  return {
    date: d,
    gy,
    gm,
    gd,
    jy,
    jm,
    jd,
    formattedJalali,
    formattedGregorian,
    monthName: JALALI_MONTH_NAMES[jm - 1],
    isLeapJalali: isLeapJalaliYear(jy),
  };
}

/**
 * ساخت Date شیء از اجزای شمسی در ساعت 00:00:00 UTC
 */
export function jalaliToDate(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0, 0));
}
