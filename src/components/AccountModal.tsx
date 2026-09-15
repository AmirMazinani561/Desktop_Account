'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderPlus, HelpCircle, Edit3 } from 'lucide-react';
import { AccountOption, AccountClass, AccountKind } from '@/types';
import { formatRial } from '@/lib/formatters';

export default function AccountModal({
  isOpen,
  onClose,
  onSuccess,
  accounts = [],
  editData = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts?: AccountOption[];
  editData?: any | null;
}) {
  const [name, setName] = useState('');
  const [accountClass, setAccountClass] = useState<AccountClass>('ASSET');
  const [accountKind, setAccountKind] = useState<AccountKind>('BANK');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingSide, setOpeningSide] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [description, setDescription] = useState('');
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
      setName(editData.name || '');
      setAccountClass(editData.accountClass || 'ASSET');
      setAccountKind(editData.accountKind || 'GENERAL');
      setOpeningBalance(
        editData.openingBalance && editData.openingBalance !== '0'
          ? Number(editData.openingBalance).toLocaleString('en-US')
          : ''
      );
      setOpeningSide(editData.openingSide || 'DEBIT');
      setDescription(editData.description || '');
    } else {
      setName('');
      setAccountClass('ASSET');
      setAccountKind('BANK');
      setOpeningBalance('');
      setOpeningSide('DEBIT');
      setDescription('');
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('لطفاً عنوان حساب را وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const cleanOpening = openingBalance ? openingBalance.replace(/,/g, '').replace(/٬/g, '').trim() : '0';
      const endpoint = isEditMode ? `/api/accounts/${editData.id}` : '/api/accounts';
      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          accountClass,
          accountKind,
          openingBalance: cleanOpening,
          openingSide,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ذخیره حساب');
      }

      setName('');
      setOpeningBalance('');
      setDescription('');
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
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              {isEditMode ? <Edit3 className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">
                {isEditMode ? `ویرایش حساب «${editData.name}»` : 'ایجاد سرفصل / حساب جدید'}
              </h2>
              <p className="text-2xs text-slate-400">
                {isEditMode ? `کد حساب: ${editData.code}` : 'شماره‌گذاری و کدینگ کوتاه به‌صورت خودکار تخصیص می‌یابد'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* بدنه فرم */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* نام حساب */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">عنوان حساب *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: بانک سامان، صندوق فروشگاه، تنخواه‌گردان، هزینه اجاره"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              required
              autoFocus
            />
          </div>

          {/* انتخاب دستی طبقه حساب و نوع کاربری (کاملاً قابل انتخاب در هر دو حالت) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">طبقه ماهیت حساب *</label>
              <select
                value={accountClass}
                onChange={(e) => setAccountClass(e.target.value as AccountClass)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="ASSET">دارایی‌ها (نقد، بانک، مطالبات)</option>
                <option value="EXPENSE">هزینه‌ها (جاری، حقوق، اداری)</option>
                <option value="INCOME">درآمدها (فروش کالا، خدمات، متفرقه)</option>
                <option value="LIABILITY">بدهی‌ها (بستانکاران، اسناد پرداختنی)</option>
                <option value="EQUITY">حقوق صاحبان سهام / سرمایه</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">نوع کاربری سرفصل *</label>
              <select
                value={accountKind}
                onChange={(e) => setAccountKind(e.target.value as AccountKind)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="BANK">حساب بانکی</option>
                <option value="CASH">صندوق نقدی</option>
                <option value="WALLET">کیف پول دیجیتال</option>
                <option value="PERSON">شخص / طرف‌حساب</option>
                <option value="COUNTERPARTY">مشتری / تامین‌کننده</option>
                <option value="GENERAL">سایر سرفصل‌های عمومی</option>
              </select>
            </div>
          </div>

          {/* مانده اولیه و ماهیت مانده (بدهکار / بستانکار) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                <span>مانده اولیه (موجودی اول دوره)</span>
                {openingBalance && (
                  <span className="text-emerald-600 text-2xs font-semibold font-mono">
                    {formatRial(openingBalance.replace(/\D/g, ''))}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={openingBalance}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setOpeningBalance(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="0"
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-3 pr-11 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  dir="ltr"
                />
                <span className="absolute right-2.5 top-2.5 text-3xs font-semibold text-slate-400 select-none">
                  ریال
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">ماهیت مانده</label>
              <select
                value={openingSide}
                onChange={(e) => setOpeningSide(e.target.value as 'DEBIT' | 'CREDIT')}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="DEBIT">بدهکار (مثبت دارایی)</option>
                <option value="CREDIT">بستانکار (طلب دیگران)</option>
              </select>
            </div>
          </div>

          {/* راهنما */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-2xs text-blue-900 leading-relaxed">
              <span className="font-bold">کدگذاری خودکار:</span>{' '}
              {isEditMode ? (
                <span>کد حساب ثابت حفظ می‌شود ({editData.code}) تا تاریخچه اسناد بدون تغییر بماند.</span>
              ) : (
                <span>کد کوتاه بعدی به صورت خودکار به این حساب اختصاص داده خواهد شد.</span>
              )}
            </div>
          </div>

          {/* توضیحات */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">یادداشت / شماره شبا و حساب</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="شماره حساب، شماره کارت، شبای بانکی یا یادداشت..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
            />
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
              {loading ? 'در حال ثبت...' : isEditMode ? 'ذخیره ویرایش حساب' : 'ایجاد حساب خودکار'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
