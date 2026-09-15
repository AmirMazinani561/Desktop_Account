import { NextResponse } from 'next/server';
import { getAccountLedger } from '@/db/repo';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const fromDate = url.searchParams.get('fromDate') || undefined;
    const toDate = url.searchParams.get('toDate') || undefined;

    const data = getAccountLedger(id, { fromDate, toDate });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای دریافت گردش حساب' }, { status: 400 });
  }
}
