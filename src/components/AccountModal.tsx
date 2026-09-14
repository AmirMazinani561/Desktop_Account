'use client';

import React, { useState, useEffect } from 'react';
import { X, Wallet, Building2, User, TrendingDown, TrendingUp, Sparkles, DollarSign } from 'lucide-react';
import { formatRial } from '@/lib/formatters';

import { AccountOption } from '@/types';

export default function AccountModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: AccountOption[];
}) {
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState<'BANK' | 'CASH' | 'PERSON' | 'EXPENSE' | 'INCOME'>('BANK');
  const [initialBalance, setInitialBalance] = useState('');
  const [isFavorite, setIsFavorite] = useState(true);
  const [customCode, setCustomCode] = useState('');
  const [autoCode, setAutoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // محاسبه خودکار کد پیشنهادی
  useEffect(() => {
    let parentPrefix = '10102'; // پیش‌فرض بانک
    let classType = 'ASSET';

    if (categoryType === 'CASH') {
      parentPrefix = '10101';
      classType = 'ASSET';
    } else if (categoryType === 'PERSON') {
      parentPrefix = '10201';
      classType = 'ASSET';
    } else if (categoryType === 'INCOME') {
      parentPrefix = '40101';
      classType = 'INCOME';
    } else if (categoryType === 'EXPENSE') {
      parentPrefix = '50101';
      classType = 'EXPENSE';
    }

    const siblings = accounts.filter((a) => a.code.startsWith(parentPrefix));
    const suffixes = siblings
      .map((a) => parseInt(a.code.slice(parentPrefix.length), 10))
      .filter((n) => !isNaN(n));

    const nextSuffix = suffixes.length === 0 ? 1 : Math.max(...suffixes) + 1;
    const generated = `${parentPrefix}${nextSuffix.toString().padStart(3, '0')}`;
    setAutoCode(generated);
  }, [categoryType, accounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('نام حساب نمی‌تواند خالی باشد.');
      return;
    }

    let accountClass: 'ASSET' | 'INCOME' | 'EXPENSE' = 'ASSET';
    let accountKind: 'BANK' | 'CASH' | 'PERSON' | 'INCOME_HEADING' | 'EXPENSE_HEADING' = 'BANK';
    let parentId: string | null = null;

    if (categoryType === 'BANK') {
      accountClass = 'ASSET';
      accountKind = 'BANK';
      const p = accounts.find((a) => a.code === '10102');
      if (p) parentId = p.id;
    } else if (categoryType === 'CASH') {
      accountClass = 'ASSET';
      accountKind = 'CASH';
      const p = accounts.find((a) => a.code === '10101');
      if (p) parentId = p.id;
    } else if (categoryType === 'PERSON') {
      accountClass = 'ASSET';
      accountKind = 'PERSON';
      const p = accounts.find((a) => a.code === '10201' || a.accountKind === 'PERSON');
      if (p) parentId = p.id;
    } else if (categoryType === 'INCOME') {
      accountClass = 'INCOME';
      accountKind = 'INCOME_HEADING';
      const p = accounts.find((a) => a.code.startsWith('4'));
      if (p) parentId = p.id;
    } else if (categoryType === 'EXPENSE') {
      accountClass = 'EXPENSE';
      accountKind = 'EXPENSE_HEADING';
      const p = accounts.find((a) => a.code.startsWith('5'));
      if (p) parentId = p.id;
    }

    setLoading(true);
    try {
      const cleanBal = initialBalance ? initialBalance.replace(/,/g, '').replace(/٬/g, '').trim() : '0';
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          accountClass,
          accountKind,
          parentId,
          code: customCode.trim() || autoCode,
          initialBalance: cleanBal,
          isFavorite,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ساخت حساب');
      }

      setName('');
      setInitialBalance('');
      setCustomCode('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطای سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* سربرگ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-base">تعریف حساب / سرفصل جدید</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* انتخاب نوع حساب */}
        <div className="px-6 pt-4">
          <label className="block text-xs font-medium text-slate-700 mb-2">نوع حساب را مشخص کنید:</label>
          <div className="grid grid-cols-3 gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={() => setCategoryType('BANK')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border transition cursor-pointer ${
                categoryType === 'BANK'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>بانک</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryType('CASH')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border transition cursor-pointer ${
                categoryType === 'CASH'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>صندوق</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryType('PERSON')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border transition cursor-pointer ${
                categoryType === 'PERSON'
                  ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4 text-purple-600" />
              <span>شخص</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryType('EXPENSE')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border transition cursor-pointer ${
                categoryType === 'EXPENSE'
                  ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>سرفصل هزینه</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryType('INCOME')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border transition cursor-pointer col-span-2 ${
                categoryType === 'INCOME'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>سرفصل درآمد</span>
            </button>
          </div>
        </div>

        {/* فرم */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              نام حساب / سرفصل *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: بانک ملت شعبه مرکزی، هزینه اینترنت..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              required
            />
          </div>

          {/* کدگذاری خودکار */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>کد حساب (کدگذاری خودکار):</span>
              </span>
              <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md">
                {customCode || autoCode}
              </span>
            </div>
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder={`پیش‌فرض خودکار: ${autoCode} (در صورت تمایل تغییر دهید)`}
              className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
          </div>

          {/* موجودی اولیه */}
          {(categoryType === 'BANK' || categoryType === 'CASH' || categoryType === 'PERSON') && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                <span>موجودی اولیه (ریال)</span>
                {initialBalance && <span className="text-emerald-600 text-2xs">{formatRial(initialBalance.replace(/\D/g, ''))}</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={initialBalance}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setInitialBalance(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="0"
                  className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  dir="ltr"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
          )}

          {/* علاقه‌مندی */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isFavorite"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="isFavorite" className="text-xs text-slate-700 cursor-pointer">
              نمایش در کارت‌های خلاصه و دسترسی سریع داشبورد
            </label>
          </div>

          {/* دکمه‌ها */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'در حال ثبت...' : 'ساخت حساب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
