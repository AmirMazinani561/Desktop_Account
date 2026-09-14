import { NextResponse } from 'next/server';
import { updateTransaction } from '@/db/repo';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = updateTransaction(id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای ویرایش تراکنش' }, { status: 400 });
  }
}
