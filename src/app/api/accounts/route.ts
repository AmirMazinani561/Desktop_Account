import { NextResponse } from 'next/server';
import { getAllAccounts, createAccount } from '@/db/repo';

export async function GET() {
  try {
    const accounts = getAllAccounts();
    return NextResponse.json(accounts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.accountClass) {
      return NextResponse.json({ error: 'نام و طبقه حساب الزامی است.' }, { status: 400 });
    }
    const acc = createAccount({
      name: body.name,
      accountClass: body.accountClass,
      accountKind: body.accountKind || 'GENERAL',
      parentId: body.parentId || null,
      openingBalance: body.openingBalance || '0',
      openingSide: body.openingSide || 'DEBIT',
      description: body.description || '',
    });
    return NextResponse.json(acc, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای ثبت حساب' }, { status: 400 });
  }
}
