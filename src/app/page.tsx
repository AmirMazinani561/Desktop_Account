import React from 'react';
import { getDashboardData } from '@/db/repo';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialData = getDashboardData();
  return <DashboardClient initialData={initialData} />;
}
