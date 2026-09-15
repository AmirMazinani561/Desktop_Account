import { NextResponse } from 'next/server';
import { deleteAccount, updateAccount } from '@/db/repo';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = updateAccount(id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای ویرایش حساب' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = deleteAccount(id);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای حذف حساب' }, { status: 400 });
  }
}
