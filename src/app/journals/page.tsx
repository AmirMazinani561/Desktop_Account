'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, ShieldCheck, Hash, Calendar, Layers } from 'lucide-react';
import { formatRial } from '@/lib/formatters';

export default function JournalsPage() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJournals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/journals');
      if (res.ok) {
        const data = await res.json();
        setJournals(data.reverse());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournals();
    const onRefresh = () => loadJournals();
    window.addEventListener('refresh-financial-data', onRefresh);
    return () => window.removeEventListener('refresh-financial-data', onRefresh);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* سربرگ */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-800">دفتر روزنامه و اسناد حسابداری دوبل‌انتری</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده سربرگ و آرتیکل‌های تفصیلی بدهکار/بستانکار هر سند و تضمین تراز ریاضی در موتور مالی
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>تضمین تراز ۱۰۰٪ در سطح دیتابیس</span>
        </div>
      </div>

      {/* لیست اسناد */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">در حال بارگذاری دفتر روزنامه...</div>
      ) : journals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
          هنوز هیچ سند حسابداری ثبت نشده است. از منوی داشبورد یا تراکنش‌ها، تراکنش جدیدی ثبت کنید تا سند دوبل‌انتری آن خودکار ساخته شود.
        </div>
      ) : (
        <div className="space-y-5">
          {journals.map((j) => {
            const isBalanced = j.totalDebit === j.totalCredit;

            return (
              <div
                key={j.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
              >
                {/* سربرگ سند */}
                <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      <Hash className="w-3.5 h-3.5 text-blue-600" />
                      <span>شماره سند: {j.serialNo}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{j.formattedJalali}</span>
                    </div>

                    <span className="text-2xs bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded">
                      {j.kind}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-600">
                      جمع سند:{' '}
                      <span className="font-bold font-mono text-slate-900">
                        {formatRial(j.totalDebit)}
                      </span>
                    </div>

                    {isBalanced ? (
                      <span className="inline-flex items-center gap-1 text-3xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>سند تراز است</span>
                      </span>
                    ) : (
                      <span className="text-3xs font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                        ناتراز!
                      </span>
                    )}
                  </div>
                </div>

                {/* شرح سند */}
                {j.description && (
                  <div className="px-5 py-2 text-xs text-slate-700 bg-slate-50/30 border-b border-slate-100 font-medium">
                    شرح: {j.description}
                  </div>
                )}

                {/* آرتیکل‌های بدهکار و بستانکار */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50/50 text-slate-500 text-3xs font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-5 w-12 text-center">ردیف</th>
                        <th className="py-2.5 px-4">کد حساب</th>
                        <th className="py-2.5 px-4">نام حساب / سرفصل</th>
                        <th className="py-2.5 px-4">نقش سطر (Line Role)</th>
                        <th className="py-2.5 px-4 text-left">بدهکار (ریال)</th>
                        <th className="py-2.5 px-4 text-left">بستانکار (ریال)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {j.lines.map((line: any) => (
                        <tr key={line.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-5 text-center text-slate-400 font-bold">{line.lineNo}</td>
                          <td className="py-2.5 px-4 font-bold text-blue-700">{line.accountCode}</td>
                          <td className="py-2.5 px-4 font-sans font-medium text-slate-800">{line.accountName}</td>
                          <td className="py-2.5 px-4 font-sans text-2xs text-slate-500">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-3xs">
                              {line.lineRole}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-left font-bold text-emerald-700">
                            {line.side === 'DEBIT' ? formatRial(line.amount) : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-left font-bold text-slate-700">
                            {line.side === 'CREDIT' ? formatRial(line.amount) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-5 font-sans text-left text-slate-600">
                          جمع کل:
                        </td>
                        <td className="py-2.5 px-4 text-left text-emerald-800 font-mono font-bold">
                          {formatRial(j.totalDebit)}
                        </td>
                        <td className="py-2.5 px-4 text-left text-slate-800 font-mono font-bold">
                          {formatRial(j.totalCredit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
