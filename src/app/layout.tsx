import './globals.css';
import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'حسابداری پیشرفته | نرم‌افزار حسابداری تحت وب',
  description: 'موتور مالی سندمحور یکپارچه برای مدیریت مالی شخصی، کسب‌وکار و شرکتی',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-slate-100 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
