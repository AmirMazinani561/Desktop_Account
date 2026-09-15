import { NextResponse } from 'next/server';
import { getAllJournals } from '@/db/repo';

export async function GET() {
  try {
    const journals = getAllJournals();
    return NextResponse.json(journals);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای دریافت اسناد' }, { status: 500 });
  }
}
