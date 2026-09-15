'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  BookOpen,
  PlusCircle,
  Building2,
} from 'lucide-react';

export default function Sidebar({ onOpenTransaction }: { onOpenTransaction?: () => void }) {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'داشبورد', icon: LayoutDashboard },
    { href: '/accounts', label: 'حساب‌ها و سرفصل‌ها', icon: Wallet },
    { href: '/transactions', label: 'تراکنش‌ها', icon: ArrowLeftRight },
    { href: '/journals', label: 'دفتر روزنامه و اسناد', icon: BookOpen },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col p-4 shrink-0 shadow-lg select-none">
      {/* لوگو و عنوان */}
      <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-slate-100">حسابداری پیشرفته</h1>
          <p className="text-xs text-slate-400">موتور مالی سندمحور (MVP)</p>
        </div>
      </div>

      {/* دکمه ثبت سریع تراکنش */}
      {onOpenTransaction && (
        <button
          onClick={onOpenTransaction}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/30 transition mb-6 cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          <span>ثبت تراکنش جدید</span>
        </button>
      )}

      {/* منوی ناوبری */}
      <nav className="flex-1 space-y-1.5">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* وضعیت سیستم و نسخه */}
      <div className="mt-auto pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>واحد پایه:</span>
          <span className="text-emerald-400 font-semibold">ریال</span>
        </div>
        <div className="flex items-center justify-between">
          <span>کدگذاری:</span>
          <span className="text-blue-400">۱۰۰٪ خودکار</span>
        </div>
        <div className="flex items-center justify-between">
          <span>سال مالی:</span>
          <span className="text-slate-300">۱۴۰۵ (باز)</span>
        </div>
      </div>
    </aside>
  );
}
