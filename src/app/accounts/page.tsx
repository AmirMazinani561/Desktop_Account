'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Building2,
  User,
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatRial } from '@/lib/formatters';
import AccountModal from '@/components/AccountModal';
import { AccountOption } from '@/types';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CASH_BANK' | 'PERSON' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    const onRefresh = () => loadAccounts();
    window.addEventListener('refresh-financial-data', onRefresh);
    return () => window.removeEventListener('refresh-financial-data', onRefresh);
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`آیا از حذف حساب «${name}» اطمینان دارید؟`)) return;

    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setActionMessage({ text: data.error || 'خطا در حذف حساب', type: 'error' });
      } else {
        setActionMessage({ text: `حساب «${name}» با موفقیت حذف شد.`, type: 'success' });
        loadAccounts();
        window.dispatchEvent(new Event('refresh-financial-data'));
      }
    } catch (e: any) {
      setActionMessage({ text: e.message || 'خطای سرور', type: 'error' });
    }
    setTimeout(() => setActionMessage(null), 5000);
  };

  // فیلتر کردن
  const filteredAccounts = accounts.filter((a) => {
    if (!a.isPostable) return false; // فقط حساب‌های برگ قابل‌ثبت

    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filter === 'CASH_BANK') return a.accountKind === 'CASH' || a.accountKind === 'BANK';
    if (filter === 'PERSON') return a.accountKind === 'PERSON';
    if (filter === 'INCOME') return a.accountClass === 'INCOME';
    if (filter === 'EXPENSE') return a.accountClass === 'EXPENSE';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* سربرگ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-800">مدیریت حساب‌ها و سرفصل‌ها</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تعریف حساب‌های بانکی، صندوق‌ها، طرف‌حساب‌ها و سرفصل‌های درآمد و هزینه با کدگذاری خودکار
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تعریف حساب جدید</span>
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* فیلترها و جستجو */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              filter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            همه حساب‌ها ({accounts.filter((a) => a.isPostable).length})
          </button>
          <button
            onClick={() => setFilter('CASH_BANK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              filter === 'CASH_BANK' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>نقد و بانک</span>
          </button>
          <button
            onClick={() => setFilter('PERSON')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              filter === 'PERSON' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>اشخاص</span>
          </button>
          <button
            onClick={() => setFilter('INCOME')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              filter === 'INCOME' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>درآمدها</span>
          </button>
          <button
            onClick={() => setFilter('EXPENSE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              filter === 'EXPENSE' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>هزینه‌ها</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در نام یا کد حساب..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
        </div>
      </div>

      {/* لیست کارت‌های حساب‌ها */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">در حال دریافت حساب‌ها...</div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 text-slate-400 text-xs">
          حسابی با این مشخصات یافت نشد. می‌توانید با دکمه «تعریف حساب جدید» یک حساب اضافه کنید.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((acc) => {
            const isAsset = acc.accountClass === 'ASSET';
            const isIncome = acc.accountClass === 'INCOME';
            const isExpense = acc.accountClass === 'EXPENSE';

            return (
              <div
                key={acc.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: acc.color || '#3B82F6' }}
                      >
                        {acc.accountKind === 'CASH' ? (
                          <Wallet className="w-4 h-4" />
                        ) : acc.accountKind === 'BANK' ? (
                          <Building2 className="w-4 h-4" />
                        ) : acc.accountKind === 'PERSON' ? (
                          <User className="w-4 h-4" />
                        ) : isIncome ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">{acc.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-3xs font-mono font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            کد: {acc.code}
                          </span>
                          {acc.isSystem && (
                            <span className="text-3xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">سیستمی</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!acc.isSystem && (
                      <button
                        onClick={() => handleDelete(acc.id, acc.name)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                        title="حذف حساب"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-2xs text-slate-500">مانده لحظه‌ای:</span>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {formatRial(acc.currentBalance)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadAccounts();
          window.dispatchEvent(new Event('refresh-financial-data'));
        }}
        accounts={accounts}
      />
    </div>
  );
}
