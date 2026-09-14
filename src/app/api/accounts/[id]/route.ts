import { NextResponse } from 'next/server';
import { deleteAccountById } from '@/db/repo';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = deleteAccountById(id);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای حذف حساب' }, { status: 400 });
  }
}
