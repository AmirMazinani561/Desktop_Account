import { NextResponse } from 'next/server';
import { getDashboardData } from '@/db/repo';

export async function GET() {
  try {
    const data = getDashboardData();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطای سرور' }, { status: 500 });
  }
}
