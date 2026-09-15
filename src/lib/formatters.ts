export function formatRial(amount: string | number | bigint | undefined | null): string {
  if (amount === undefined || amount === null) return '۰ ریال';
  const num = typeof amount === 'bigint' ? amount : BigInt(Math.round(Number(amount) || 0));
  const isNegative = num < 0n;
  const absNum = isNegative ? -num : num;
  const str = absNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return `${isNegative ? '-' : ''}${str} ریال`;
}

export function formatNumber(amount: string | number | bigint | undefined | null): string {
  if (amount === undefined || amount === null) return '0';
  const num = typeof amount === 'bigint' ? amount : BigInt(Math.round(Number(amount) || 0));
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
}
