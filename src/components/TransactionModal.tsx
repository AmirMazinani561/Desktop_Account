'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, TrendingDown, TrendingUp, DollarSign, Calendar, FileText, Hash } from 'lucide-react';
import { formatRial } from '@/lib/formatters';

import { AccountOption } from '@/types';

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  todayJalali,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: AccountOption[];
  todayJalali?: string;
}) {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [shamsiDate, setShamsiDate] = useState(todayJalali || '1405/06/23');
  const [description, setDescription] = useState('');
  const [refNo, setRefNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (todayJalali) setShamsiDate(todayJalali);
  }, [todayJalali]);

  // تنظیم هوشمند گزینه‌های مبدأ و مقصد بر اساس نوع
  useEffect(() => {
    const postable = accounts.filter((a) => a.isPostable);
    const cashAndBank = postable.filter((a) => a.accountKind === 'CASH' || a.accountKind === 'BANK');
    const expenses = postable.filter((a) => a.accountClass === 'EXPENSE');
    const incomes = postable.filter((a) => a.accountClass === 'INCOME');

    if (type === 'EXPENSE') {
      if (cashAndBank.length > 0) setSourceId(cashAndBank[0].id);
      if (expenses.length > 0) setDestId(expenses[0].id);
    } else if (type === 'INCOME') {
      if (incomes.length > 0) setSourceId(incomes[0].id);
      if (cashAndBank.length > 0) setDestId(cashAndBank[0].id);
    } else {
      // TRANSFER
      if (cashAndBank.length > 0) setSourceId(cashAndBank[0].id);
      if (cashAndBank.length > 1) setDestId(cashAndBank[1].id);
      else if (postable.length > 0) setDestId(postable[0].id);
    }
  }, [type, accounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanAmount = amount.replace(/,/g, '').replace(/٬/g, '').trim();
    if (!cleanAmount || Number(cleanAmount) <= 0) {
      setError('لطفاً مبلغ معتبری وارد کنید.');
      return;
    }
    if (!sourceId || !destId) {
      setError('لطفاً هر دو حساب مبدأ و مقصد را انتخاب کنید.');
      return;
    }
    if (sourceId === destId) {
      setError('حساب مبدأ و مقصد نمی‌توانند یکسان باشند.');
      return;
    }

    setLoading(true);
    try {
      const cleanFee = fee ? fee.replace(/,/g, '').replace(/٬/g, '').trim() : '0';
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAccountId: sourceId,
          destinationAccountId: destId,
          amount: cleanAmount,
          fee: cleanFee,
          shamsiDate,
          description,
          refNo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ثبت تراکنش');
      }

      // بازنشانی فرم و موفقیت
      setAmount('');
      setFee('');
      setDescription('');
      setRefNo('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطای برقراری ارتباط');
    } finally {
      setLoading(false);
    }
  };

  const postableAccounts = accounts.filter((a) => a.isPostable);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* سربرگ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-base">ثبت تراکنش جدید</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* انتخاب نوع تراکنش */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-xs font-semibold' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>هزینه (پرداخت)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                type === 'INCOME' ? 'bg-emerald-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>درآمد (دریافت)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('TRANSFER')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                type === 'TRANSFER' ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>انتقال / کارت‌به‌کارت</span>
            </button>
          </div>
        </div>

        {/* بدنه فرم */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* حساب مبدأ و مقصد */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {type === 'INCOME' ? 'سرفصل درآمد (مبدأ)' : 'پرداخت از (مبدأ)'}
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {postableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {type === 'EXPENSE' ? 'بابت سرفصل (مقصد)' : 'واریز به (مقصد)'}
              </label>
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {postableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* مبلغ و کارمزد */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                <span>مبلغ (ریال) *</span>
                {amount && <span className="text-emerald-600 text-2xs font-semibold">{formatRial(amount.replace(/\D/g, ''))}</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۵٬۰۰۰٬۰۰۰"
                  className="w-full text-sm font-semibold tracking-wide bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  dir="ltr"
                  required
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">کارمزد بانکی (اختیاری)</label>
              <input
                type="text"
                value={fee}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setFee(raw ? Number(raw).toLocaleString('en-US') : '');
                }}
                placeholder="مثال: ۱۰٬۰۰۰"
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                dir="ltr"
              />
            </div>
          </div>

          {/* تاریخ شمسی و شماره پیگیری */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">تاریخ شمسی</label>
              <div className="relative">
                <input
                  type="text"
                  value={shamsiDate}
                  onChange={(e) => setShamsiDate(e.target.value)}
                  placeholder="1405/06/23"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  dir="ltr"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">کد پیگیری / ارجاع</label>
              <div className="relative">
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="مثال: TR-123456"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  dir="ltr"
                />
                <Hash className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* شرح سند */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">شرح تراکنش</label>
            <div className="relative">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات اختیاری درباره این تراکنش..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>

          {/* دکمه‌های ثبت */}
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
              {loading ? 'در حال ثبت...' : 'ثبت سند و اعمال در مانده'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
