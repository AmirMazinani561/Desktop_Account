'use client';

import React, { useState, useEffect } from 'react';
import { X, BookOpen, Printer, ArrowDownLeft, ArrowUpRight, Calendar, Hash, RefreshCw } from 'lucide-react';
import { formatRial } from '@/lib/formatters';

export default function AccountLedgerModal({
  accountId,
  isOpen,
  onClose,
}: {
  accountId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/ledger`);
      if (!res.ok) throw new Error('خطا در دریافت گردش حساب');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accountId) {
      fetchLedger();
    } else {
      setData(null);
    }
  }, [isOpen, accountId]);

  if (!isOpen || !accountId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* سربرگ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-sm">{data?.account?.name || 'گزارش گردش حساب'}</h2>
                {data?.account?.code && (
                  <span className="text-3xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    کد: {data?.account?.code}
                  </span>
                )}
              </div>
              <p className="text-2xs text-slate-500 mt-0.5">صورت‌حساب تفصیلی و مانده لحظه‌ای</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* کارت‌های خلاصه آمار */}
        {data && (
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50/50 border-b border-slate-100 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-2xs block mb-1">جمع بدهکار (ورودی):</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">{formatRial(data.totalDebit)}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-2xs block mb-1">جمع بستانکار (خروجی):</span>
              <span className="font-mono font-bold text-slate-700 text-sm">{formatRial(data.totalCredit)}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-200 bg-blue-50/30">
              <span className="text-blue-700 text-2xs font-semibold block mb-1">مانده نهایی لحظه‌ای:</span>
              <span className="font-mono font-extrabold text-blue-900 text-sm">{formatRial(data.finalBalance)}</span>
            </div>
          </div>
        )}

        {/* جدول گردش */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>در حال بارگذاری گردش حساب...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-rose-700 bg-rose-50 rounded-xl">{error}</div>
          ) : data?.entries?.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              هیچ گردش مالی برای این حساب ثبت نشده است.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-600 text-3xs font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">سند</th>
                    <th className="py-3 px-3.5">تاریخ شمسی</th>
                    <th className="py-3 px-3.5">حساب مقابل</th>
                    <th className="py-3 px-3.5">شرح</th>
                    <th className="py-3 px-3.5 text-left text-emerald-700">بدهکار (ریال)</th>
                    <th className="py-3 px-3.5 text-left text-rose-700">بستانکار (ریال)</th>
                    <th className="py-3 px-3.5 text-left text-blue-800">مانده لحظه‌ای</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {data?.entries?.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3.5 font-bold text-slate-700">{row.serialNo}</td>
                      <td className="py-2.5 px-3.5 text-slate-600">{row.formattedJalali}</td>
                      <td className="py-2.5 px-3.5 font-sans font-medium text-slate-800">{row.counterAccountName}</td>
                      <td className="py-2.5 px-3.5 font-sans text-slate-600">
                        <div>{row.description}</div>
                        {row.refNo && <div className="text-3xs text-slate-400 font-mono">پیگیری: {row.refNo}</div>}
                      </td>
                      <td className="py-2.5 px-3.5 text-left font-bold text-emerald-700">
                        {row.debit !== '0' ? formatRial(row.debit) : '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-left font-bold text-slate-700">
                        {row.credit !== '0' ? formatRial(row.credit) : '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-left font-extrabold text-blue-900 bg-blue-50/20">
                        {formatRial(row.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* پاورقی */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-left">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
