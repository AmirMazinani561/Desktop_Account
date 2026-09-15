'use client';

import React from 'react';
import { Calendar, Building, Plus } from 'lucide-react';

export default function TopBar({
  todayJalali,
  onOpenTransaction,
  onOpenAccount,
}: {
  todayJalali?: string;
  onOpenTransaction?: () => void;
  onOpenAccount?: () => void;
}) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium">
          <Building className="w-4 h-4 text-slate-500" />
          <span>حسابداری شخصی و کسب‌وکار من</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>امروز: {todayJalali || '۲۳ شهریور ۱۴۰۵'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {onOpenAccount && (
          <button
            onClick={onOpenAccount}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>حساب جدید</span>
          </button>
        )}
        {onOpenTransaction && (
          <button
            onClick={onOpenTransaction}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت تراکنش</span>
          </button>
        )}
      </div>
    </header>
  );
}
