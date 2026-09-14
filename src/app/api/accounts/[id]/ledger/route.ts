import { NextResponse } from 'next/server';
import { getAccountLedger } from '@/db/repo';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = getAccountLedger(id);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای دریافت گردش حساب' }, { status: 400 });
  }
}
