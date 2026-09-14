'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  Search,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Edit2,
  Trash2,
} from 'lucide-react';
import { formatRial } from '@/lib/formatters';
import TransactionModal from '@/components/TransactionModal';
import { AccountOption } from '@/types';

export default function TransactionsPage() {
  const [journals, setJournals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [todayJalali, setTodayJalali] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resJ, resA, resD] = await Promise.all([
        fetch('/api/journals'),
        fetch('/api/accounts'),
        fetch('/api/dashboard'),
      ]);

      if (resJ.ok) {
        const jData = await resJ.json();
        setJournals(jData.reverse()); // جدیدترین اول
      }
      if (resA.ok) {
        const aData = await resA.json();
        setAccounts(aData);
      }
      if (resD.ok) {
        const dData = await resD.json();
        setTodayJalali(dData.todayJalali);
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

  const handleEdit = (journal: any) => {
    const srcLine = journal.lines.find((l: any) => l.lineRole === 'SOURCE');
    const dstLine = journal.lines.find((l: any) => l.lineRole === 'DESTINATION');
    const feeLine = journal.lines.find((l: any) => l.lineRole === 'FEE');

    setEditingTx({
      id: journal.id,
      serialNo: journal.serialNo,
      sourceAccountId: srcLine?.accountId,
      destinationAccountId: dstLine?.accountId,
      amount: dstLine ? dstLine.amount : journal.totalDebit,
      fee: feeLine ? feeLine.amount : '0',
      formattedJalali: journal.formattedJalali,
      description: journal.description || '',
      refNo: journal.refNo || '',
    });
    setIsModalOpen(true);
  };

  const handleVoid = async (id: string, serialNo: string) => {
    const reason = prompt(`دلیل ابطال سند شماره ${serialNo} را وارد کنید:`, 'اشتباه در ثبت');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/transactions/${id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionMessage({ text: data.error || 'خطا در ابطال تراکنش', type: 'error' });
      } else {
        setActionMessage({ text: `سند شماره ${serialNo} با موفقیت ابطال شد و اثر آن از مانده‌ها کسر گردید.`, type: 'success' });
        loadData();
        window.dispatchEvent(new Event('refresh-financial-data'));
      }
    } catch (e: any) {
      setActionMessage({ text: e.message || 'خطای سرور', type: 'error' });
    }
    setTimeout(() => setActionMessage(null), 5000);
  };

  const filteredJournals = journals.filter((j) => {
    const term = searchTerm.toLowerCase();
    const matchDesc = j.description?.toLowerCase().includes(term);
    const matchRef = j.refNo?.toLowerCase().includes(term);
    const matchSerial = j.serialNo?.includes(term);
    const matchAcc = j.lines?.some((l: any) => l.accountName?.toLowerCase().includes(term));

    return !searchTerm || matchDesc || matchRef || matchSerial || matchAcc;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* سربرگ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-800">تراکنش‌ها و گردش‌های مالی</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            فهرست اسناد ثبتی، ویرایش مبالغ و حساب‌ها، تقویم شمسی تعاملی، و ابطال با سند متقابل
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTx(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت تراکنش جدید</span>
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

      {/* جستجو */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در شرح، کد پیگیری، شماره سند یا نام حساب..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
        </div>
        <div className="text-xs text-slate-500">
          تعداد: <span className="font-bold text-slate-800">{filteredJournals.length}</span> سند
        </div>
      </div>

      {/* جدول تراکنش‌ها */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">در حال دریافت تراکنش‌ها...</div>
        ) : filteredJournals.length === 0 ? (
          <div className="text-center py-12 p-8 text-slate-400 text-xs">
            هیچ تراکنشی یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-3xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">شماره سند</th>
                  <th className="py-3.5 px-4">تاریخ شمسی</th>
                  <th className="py-3.5 px-4">حساب مبدأ (بستانکار)</th>
                  <th className="py-3.5 px-4">حساب مقصد (بدهکار)</th>
                  <th className="py-3.5 px-4">مبلغ (ریال)</th>
                  <th className="py-3.5 px-4">کارمزد</th>
                  <th className="py-3.5 px-4">شرح و کد پیگیری</th>
                  <th className="py-3.5 px-4">وضعیت</th>
                  <th className="py-3.5 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJournals.map((j) => {
                  const srcLine = j.lines.find((l: any) => l.lineRole === 'SOURCE');
                  const dstLine = j.lines.find((l: any) => l.lineRole === 'DESTINATION');
                  const feeLine = j.lines.find((l: any) => l.lineRole === 'FEE');
                  const isVoid = j.status === 'VOID';

                  return (
                    <tr
                      key={j.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isVoid ? 'bg-slate-50/50 text-slate-400 opacity-70' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {j.serialNo}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {j.formattedJalali}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {srcLine ? srcLine.accountName : 'نامشخص'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {dstLine ? dstLine.accountName : 'نامشخص'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {dstLine ? formatRial(dstLine.amount) : formatRial(j.totalDebit)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {feeLine ? formatRial(feeLine.amount) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{j.description || 'بدون شرح'}</div>
                        {j.refNo && (
                          <div className="text-3xs font-mono text-slate-400 mt-0.5">پیگیری: {j.refNo}</div>
                        )}
                        {isVoid && j.voidReason && (
                          <div className="text-3xs text-rose-500 mt-0.5">علت ابطال: {j.voidReason}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isVoid ? (
                          <span className="inline-flex items-center gap-1 text-3xs font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>باطل‌شده (VOID)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-3xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ثبت‌شده (POSTED)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!isVoid && (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(j)}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition font-medium flex items-center gap-1 cursor-pointer"
                              title="ویرایش تراکنش"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>ویرایش</span>
                            </button>
                            <button
                              onClick={() => handleVoid(j.id, j.serialNo)}
                              className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition font-medium cursor-pointer"
                              title="ابطال سند"
                            >
                              ابطال
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        onSuccess={() => {
          loadData();
          window.dispatchEvent(new Event('refresh-financial-data'));
        }}
        accounts={accounts}
        todayJalali={todayJalali}
        editData={editingTx}
      />
    </div>
  );
}
