'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Printer,
  Calendar,
  Building2,
  Wallet,
  TrendingUp,
  TrendingDown,
  User,
  Filter,
  CheckCircle2,
  Edit2,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react';
import { formatRial } from '@/lib/formatters';
import ShamsiDatePicker from '@/components/ShamsiDatePicker';
import TransactionModal from '@/components/TransactionModal';
import { AccountOption } from '@/types';

interface AccountLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  allAccounts?: AccountOption[];
}

export default function AccountLedgerModal({
  isOpen,
  onClose,
  accountId,
  allAccounts = [],
}: AccountLedgerModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // فیلترهای تاریخ
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activePreset, setActivePreset] = useState<'ALL' | 'THIS_YEAR' | 'THIS_MONTH' | 'LAST_30_DAYS'>('ALL');

  // ویرایش تراکنش داخل صورت‌حساب
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [accountsList, setAccountsList] = useState<AccountOption[]>(allAccounts);

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

  const fetchLedger = useCallback(async (start?: string, end?: string) => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      let url = `/api/accounts/${accountId}/ledger`;
      const params = new URLSearchParams();
      if (start) params.set('fromDate', start);
      if (end) params.set('toDate', end);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در بارگذاری صورت‌حساب');
      setData(json);
    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (isOpen && accountId) {
      fetchLedger(fromDate, toDate);
      if (accountsList.length === 0) {
        fetch('/api/accounts')
          .then((r) => r.json())
          .then((accs) => setAccountsList(accs))
          .catch(console.error);
      }
    }
  }, [isOpen, accountId, fetchLedger, fromDate, toDate, accountsList.length]);

  if (!isOpen) return null;

  const handlePreset = (preset: 'ALL' | 'THIS_YEAR' | 'THIS_MONTH' | 'LAST_30_DAYS') => {
    setActivePreset(preset);
    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
      fetchLedger('', '');
    } else if (preset === 'THIS_YEAR') {
      setFromDate('1405/01/01');
      setToDate('1405/12/29');
      fetchLedger('1405/01/01', '1405/12/29');
    } else if (preset === 'THIS_MONTH') {
      setFromDate('1405/06/01');
      setToDate('1405/06/31');
      fetchLedger('1405/06/01', '1405/06/31');
    } else if (preset === 'LAST_30_DAYS') {
      setFromDate('1405/05/24');
      setToDate('1405/06/24');
      fetchLedger('1405/05/24', '1405/06/24');
    }
  };

  const handleApplyCustomFilter = () => {
    setActivePreset('ALL');
    fetchLedger(fromDate, toDate);
  };

  const handleVoidTx = async (journalId: string, serialNo: string) => {
    const reason = prompt(`دلیل ابطال سند شماره ${serialNo} را وارد کنید:`, 'اشتباه در ثبت');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/transactions/${journalId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'خطا در ابطال سند');
      } else {
        fetchLedger(fromDate, toDate);
        window.dispatchEvent(new Event('refresh-financial-data'));
      }
    } catch (e: any) {
      alert(e.message || 'خطای برقراری ارتباط');
    }
  };

  const handleEditTx = async (journalId: string) => {
    try {
      const res = await fetch('/api/journals');
      if (!res.ok) return;
      const journals = await res.json();
      const target = journals.find((j: any) => j.id === journalId);
      if (!target) return;

      const srcLine = target.lines.find((l: any) => l.lineRole === 'SOURCE');
      const dstLine = target.lines.find((l: any) => l.lineRole === 'DESTINATION');
      const feeLine = target.lines.find((l: any) => l.lineRole === 'FEE');

      setEditingTx({
        id: target.id,
        serialNo: target.serialNo,
        sourceAccountId: srcLine?.accountId,
        destinationAccountId: dstLine?.accountId,
        amount: dstLine ? dstLine.amount : target.totalDebit,
        fee: feeLine ? feeLine.amount : '0',
        formattedJalali: target.formattedJalali,
        description: target.description || '',
        refNo: target.refNo || '',
      });
      setIsTxModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const acc = data?.account;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* سربرگ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: acc?.color || '#3B82F6' }}
            >
              {acc?.accountKind === 'CASH' ? (
                <Wallet className="w-5 h-5" />
              ) : acc?.accountKind === 'BANK' ? (
                <Building2 className="w-5 h-5" />
              ) : acc?.accountKind === 'PERSON' ? (
                <User className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 text-sm">
                  صورت‌حساب ریزگردش: {acc?.name || 'در حال بارگذاری...'}
                </h2>
                {acc?.code && (
                  <span className="text-3xs font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                    کد حساب: {acc.code}
                  </span>
                )}
              </div>
              <p className="text-2xs text-slate-400 mt-0.5">
                تراز متوالی لحظه‌ای (Running Balance) • نمایش سرفصل‌های متقابل و مبالغ به ریال
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              title="چاپ صورت‌حساب"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">چاپ / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* فیلترهای بازه زمانی */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* دکمه‌های بازه سریع */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-500 text-2xs font-bold pl-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              بازه:
            </span>
            <button
              type="button"
              onClick={() => handlePreset('ALL')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition cursor-pointer ${
                activePreset === 'ALL' && !fromDate && !toDate
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه اسناد
            </button>
            <button
              type="button"
              onClick={() => handlePreset('THIS_MONTH')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition cursor-pointer ${
                activePreset === 'THIS_MONTH' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              این ماه (شهریور)
            </button>
            <button
              type="button"
              onClick={() => handlePreset('LAST_30_DAYS')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition cursor-pointer ${
                activePreset === 'LAST_30_DAYS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ۳۰ روز اخیر
            </button>
            <button
              type="button"
              onClick={() => handlePreset('THIS_YEAR')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition cursor-pointer ${
                activePreset === 'THIS_YEAR' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              سال ۱۴۰۵
            </button>
          </div>

          {/* فیلدهای انتخاب تاریخ شمسی */}
          <div className="flex items-center gap-2">
            <div className="w-32">
              <ShamsiDatePicker
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d);
                  setActivePreset('ALL');
                }}
                label=""
                placeholder="از تاریخ شمسی"
              />
            </div>
            <span className="text-slate-400 text-xs">تا</span>
            <div className="w-32">
              <ShamsiDatePicker
                value={toDate}
                onChange={(d) => {
                  setToDate(d);
                  setActivePreset('ALL');
                }}
                label=""
                placeholder="تا تاریخ شمسی"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyCustomFilter}
              className="px-3 py-2 bg-slate-900 text-white rounded-xl text-2xs font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              اعمال فیلتر
            </button>
          </div>
        </div>

        {/* کارت‌های خلاصه آماری صورت‌حساب */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-3xs text-slate-400 font-medium mb-0.5">مانده اول دوره</div>
            <div className="text-xs font-bold font-mono text-slate-800">
              {formatRial(data?.openingBalance || 0)}
              <span className="text-3xs font-normal text-slate-400 mr-1">
                ({data?.openingSide === 'CREDIT' ? 'بستانکار' : 'بدهکار'})
              </span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-3xs text-slate-400 font-medium mb-0.5">مجموع بدهکار (واریزی‌ها)</div>
            <div className="text-xs font-bold font-mono text-emerald-600">
              {formatRial(data?.totalDebit || 0)}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-3xs text-slate-400 font-medium mb-0.5">مجموع بستانکار (برداشت‌ها)</div>
            <div className="text-xs font-bold font-mono text-rose-600">
              {formatRial(data?.totalCredit || 0)}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs">
            <div className="text-3xs text-blue-600 font-bold mb-0.5">مانده نهایی لحظه‌ای</div>
            <div className="text-sm font-bold font-mono text-blue-700">
              {formatRial(data?.finalBalance || 0)}
            </div>
          </div>
        </div>

        {/* جدول ریزگردش معین */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs">در حال دریافت ریزگردش اسناد...</div>
          ) : error ? (
            <div className="text-center py-12 text-rose-500 text-xs">{error}</div>
          ) : data?.entries?.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              در بازه تاریخی انتخاب‌شده هیچ تراکنشی برای این حساب ثبت نشده است.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 text-3xs font-bold">
                  <tr>
                    <th className="py-3 px-3">ردیف</th>
                    <th className="py-3 px-3">تاریخ شمسی</th>
                    <th className="py-3 px-3">شماره سند</th>
                    <th className="py-3 px-4">شرح تراکنش / پیگیری</th>
                    <th className="py-3 px-3">سرفصل مقابل</th>
                    <th className="py-3 px-3 text-emerald-700">بدهکار (+)</th>
                    <th className="py-3 px-3 text-rose-700">بستانکار (-)</th>
                    <th className="py-3 px-4 text-blue-700">مانده متوالی</th>
                    <th className="py-3 px-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.entries.map((e: any, idx: number) => {
                    const isDebit = e.debit && e.debit !== '0';
                    const isCredit = e.credit && e.credit !== '0';

                    return (
                      <tr key={e.id || idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-3xs">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 text-2xs">
                          {e.formattedJalali}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-2xs">
                          {e.serialNo}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800">
                          <div className="font-semibold">{e.description}</div>
                          {e.refNo && (
                            <div className="text-3xs font-mono text-slate-400 mt-0.5">کد ارجاع: {e.refNo}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-600 text-2xs">
                          {e.counterAccountName}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                          {isDebit ? formatRial(e.debit) : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-600">
                          {isCredit ? formatRial(e.credit) : '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900 bg-slate-50/50">
                          {formatRial(e.runningBalance)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditTx(e.journalId)}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                              title="ویرایش این تراکنش"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoidTx(e.journalId, e.serialNo)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="ابطال این تراکنش"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* پاورقی */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex items-center justify-between text-2xs text-slate-500 shrink-0">
          <div>
            تعداد ردیف‌های گردش: <span className="font-bold text-slate-800">{data?.entries?.length || 0}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>

      {/* مودال ویرایش تراکنش داخل صورت‌حساب */}
      {isTxModalOpen && (
        <TransactionModal
          isOpen={isTxModalOpen}
          onClose={() => {
            setIsTxModalOpen(false);
            setEditingTx(null);
          }}
          onSuccess={() => {
            fetchLedger(fromDate, toDate);
            window.dispatchEvent(new Event('refresh-financial-data'));
          }}
          accounts={accountsList}
          editData={editingTx}
        />
      )}
    </div>
  );
}
