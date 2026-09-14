import { NextResponse } from 'next/server';
import { voidTransaction } from '@/db/repo';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const res = voidTransaction(id, body.reason || 'ابطال توسط کاربر');
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای ابطال تراکنش' }, { status: 400 });
  }
}
