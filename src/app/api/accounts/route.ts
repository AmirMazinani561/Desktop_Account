import { NextResponse } from 'next/server';
import { getAllAccounts, createNewAccount } from '@/db/repo';

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
    if (!body.name || !body.accountClass || !body.accountKind) {
      return NextResponse.json({ error: 'نام، گروه و نوع حساب الزامی است.' }, { status: 400 });
    }
    const acc = createNewAccount(body);
    return NextResponse.json(acc, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای ثبت حساب' }, { status: 400 });
  }
}
