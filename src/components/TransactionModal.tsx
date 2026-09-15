'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, TrendingDown, TrendingUp, FileText, Hash } from 'lucide-react';
import { formatRial } from '@/lib/formatters';
import { AccountOption } from '@/types';
import ShamsiDatePicker from '@/components/ShamsiDatePicker';
import AccountSelect from '@/components/AccountSelect';

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  todayJalali,
  editData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: AccountOption[];
  todayJalali?: string;
  editData?: any | null;
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

  const isEditMode = !!editData;

  // قفل کردن اسکرول صفحه پس‌زمینه هنگام باز بودن مودال
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      setSourceId(editData.sourceAccountId || '');
      setDestId(editData.destinationAccountId || '');
      setAmount(editData.amount ? Number(editData.amount).toLocaleString('en-US') : '');
      setFee(editData.fee && editData.fee !== '0' ? Number(editData.fee).toLocaleString('en-US') : '');
      setShamsiDate(editData.formattedJalali || todayJalali || '1405/06/23');
      setDescription(editData.description || '');
      setRefNo(editData.refNo || '');
    } else {
      if (todayJalali) setShamsiDate(todayJalali);
      const postable = accounts.filter((a) => a.isPostable);
      const cashAndBank = postable.filter((a) => a.accountKind === 'CASH' || a.accountKind === 'BANK' || a.accountKind === 'WALLET');
      const expenses = postable.filter((a) => a.accountClass === 'EXPENSE');
      const incomes = postable.filter((a) => a.accountClass === 'INCOME');

      if (type === 'EXPENSE') {
        if (cashAndBank.length > 0 && !sourceId) setSourceId(cashAndBank[0].id);
        if (expenses.length > 0 && !destId) setDestId(expenses[0].id);
      } else if (type === 'INCOME') {
        if (incomes.length > 0 && !sourceId) setSourceId(incomes[0].id);
        if (cashAndBank.length > 0 && !destId) setDestId(cashAndBank[0].id);
      } else {
        if (cashAndBank.length > 0 && !sourceId) setSourceId(cashAndBank[0].id);
        if (cashAndBank.length > 1 && !destId) setDestId(cashAndBank[1].id);
      }
    }
  }, [editData, type, accounts, todayJalali, isOpen]);

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
      const endpoint = isEditMode ? `/api/transactions/${editData.id}` : '/api/transactions';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* سربرگ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl">
          <h2 className="font-bold text-slate-800 text-sm">
            {isEditMode ? `ویرایش تراکنش (سند شماره ${editData.serialNo})` : 'ثبت تراکنش جدید'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* انتخاب نوع تراکنش */}
        {!isEditMode && (
          <div className="px-6 pt-4">
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setType('EXPENSE');
                  setSourceId('');
                  setDestId('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                  type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-xs font-semibold' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>هزینه (پرداخت)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('INCOME');
                  setSourceId('');
                  setDestId('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                  type === 'INCOME' ? 'bg-emerald-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>درآمد (دریافت)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('TRANSFER');
                  setSourceId('');
                  setDestId('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                  type === 'TRANSFER' ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>انتقال / جابجایی</span>
              </button>
            </div>
          </div>
        )}

        {/* بدنه فرم */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* حساب مبدأ و مقصد با سرچ داینامیک */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AccountSelect
              accounts={accounts}
              value={sourceId}
              onChange={setSourceId}
              label={type === 'INCOME' ? 'سرفصل درآمد (مبدأ)' : 'پرداخت از (مبدأ)'}
              placeholder="جستجوی حساب مبدأ..."
            />
            <AccountSelect
              accounts={accounts}
              value={destId}
              onChange={setDestId}
              label={type === 'EXPENSE' ? 'بابت سرفصل (مقصد)' : 'واریز به (مقصد)'}
              placeholder="جستجوی حساب مقصد..."
            />
          </div>

          {/* مبلغ و کارمزد بدون علامت $ با فونت تمیز فارسی */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                <span>مبلغ *</span>
                {amount && (
                  <span className="text-emerald-600 text-2xs font-semibold font-mono">
                    {formatRial(amount.replace(/\D/g, ''))}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۵,۰۰۰,۰۰۰"
                  className="w-full text-sm font-bold tracking-wide bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-11 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                  dir="ltr"
                  required
                />
                <span className="absolute right-3 top-3 text-2xs font-semibold text-slate-500 select-none">
                  ریال
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                <span>کارمزد بانکی</span>
                {fee && (
                  <span className="text-rose-500 text-2xs font-semibold font-mono">
                    {formatRial(fee.replace(/\D/g, ''))}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fee}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setFee(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۱۰,۰۰۰"
                  className="w-full text-sm font-bold tracking-wide bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-11 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                  dir="ltr"
                />
                <span className="absolute right-3 top-3 text-2xs font-semibold text-slate-500 select-none">
                  ریال
                </span>
              </div>
            </div>
          </div>

          {/* تقویم انتخابی شمسی و شماره پیگیری */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <ShamsiDatePicker
                value={shamsiDate}
                onChange={(d) => setShamsiDate(d)}
                label="تاریخ شمسی"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">کد پیگیری / ارجاع</label>
              <div className="relative">
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="مثال: TR-123456"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                  dir="ltr"
                />
                <Hash className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* شرح تراکنش */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">شرح تراکنش</label>
            <div className="relative">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات و بابت این تراکنش..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'در حال ثبت...' : isEditMode ? 'ذخیره تغییرات سند' : 'ثبت سند و اعمال در مانده'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
