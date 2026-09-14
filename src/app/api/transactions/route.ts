import { NextResponse } from 'next/server';
import { createTransaction, getDashboardData } from '@/db/repo';

export async function GET() {
  try {
    const data = getDashboardData();
    return NextResponse.json(data.recentTransactions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای دریافت تراکنش‌ها' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.sourceAccountId || !body.destinationAccountId || !body.amount) {
      return NextResponse.json({ error: 'حساب مبدأ، مقصد و مبلغ الزامی هستند.' }, { status: 400 });
    }
    const journal = createTransaction(body);
    return NextResponse.json(journal, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای ثبت تراکنش' }, { status: 400 });
  }
}
