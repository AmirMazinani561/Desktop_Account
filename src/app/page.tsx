'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Building2,
  ArrowRightLeft,
  BookOpen,
  PlusCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
} from 'lucide-react';
import { formatRial } from '@/lib/formatters';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const onRefresh = () => loadData();
    window.addEventListener('refresh-financial-data', onRefresh);
    return () => window.removeEventListener('refresh-financial-data', onRefresh);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-500 text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>در حال بارگذاری داشبورد...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* سربرگ خوش‌آمدگویی */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-md">
        <div>
          <h1 className="text-xl font-bold tracking-tight mb-1">داشبورد خلاصه مالی</h1>
          <p className="text-xs text-slate-300">
            موتور مالی سندمحور (تراز خودکار) • تاریخ امروز: <span className="text-emerald-400 font-semibold">{data?.todayJalali}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/transactions"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition shadow-xs"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>مشاهده همه تراکنش‌ها</span>
          </Link>
          <Link
            href="/journals"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition"
          >
            <BookOpen className="w-4 h-4" />
            <span>دفتر روزنامه (اسناد)</span>
          </Link>
        </div>
      </div>

      {/* ۳ کارت کلیدی شاخص‌های مالی */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* موجودی نقد و بانک */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">موجودی کل نقد و بانک</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 mb-1 font-mono">
              {formatRial(data?.totalCashAndBank)}
            </div>
            <p className="text-2xs text-slate-400">جمع موجودی حساب‌های بانکی و صندوق‌ها</p>
          </div>
        </div>

        {/* درآمد ماه جاری */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">درآمد ماه ({data?.monthName})</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 mb-1 font-mono">
              {formatRial(data?.currentMonthIncome)}
            </div>
            <p className="text-2xs text-slate-400">مجموع دریافتی‌های ثبت‌شده در این ماه</p>
          </div>
        </div>

        {/* هزینه ماه جاری */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">هزینه‌های ماه ({data?.monthName})</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-rose-600 mb-1 font-mono">
              {formatRial(data?.currentMonthExpense)}
            </div>
            <p className="text-2xs text-slate-400">مجموع مخارج و پرداختی‌های این ماه</p>
          </div>
        </div>
      </div>

      {/* دو ستون: کارت‌های حساب نقد/بانک + آخرین تراکنش‌ها */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ستون راست: حساب‌های فعال نقد و بانک */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800">حساب‌های نقدی و بانکی</h2>
            </div>
            <Link href="/accounts" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
              <span>مدیریت</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {data?.cashAndBankAccounts?.map((acc: any) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: acc.color || '#3B82F6' }}
                  >
                    {acc.accountKind === 'CASH' ? <Wallet className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{acc.name}</div>
                    <div className="text-3xs font-mono text-slate-400">کد: {acc.code}</div>
                  </div>
                </div>
                <div className="text-xs font-bold font-mono text-slate-900">
                  {formatRial(acc.currentBalance)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ستون چپ (عریض‌تر): آخرین تراکنش‌ها */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800">آخرین تراکنش‌های ثبت‌شده</h2>
            </div>
            <Link href="/transactions" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
              <span>مشاهده همه ({data?.transactionsCount})</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data?.recentTransactions?.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              هنوز هیچ تراکنشی ثبت نشده است. از دکمه «ثبت تراکنش جدید» شروع کنید.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data?.recentTransactions?.map((tx: any) => (
                <div key={tx.id} className="py-3 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-lg transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                        <span>{tx.description}</span>
                        {tx.refNo && (
                          <span className="text-3xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {tx.refNo}
                          </span>
                        )}
                      </div>
                      <div className="text-2xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>از: {tx.sourceName}</span>
                        <span>←</span>
                        <span>به: {tx.destinationName}</span>
                        <span>•</span>
                        <span>{tx.formattedJalali}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-xs font-bold font-mono text-slate-900">
                      {formatRial(tx.amount)}
                    </div>
                    {tx.fee !== '0' && (
                      <div className="text-3xs text-rose-500 font-mono">
                        کارمزد: {formatRial(tx.fee)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
