'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Wallet, Building2, User, TrendingDown, TrendingUp, HelpCircle } from 'lucide-react';
import { AccountOption } from '@/types';
import { formatRial } from '@/lib/formatters';

interface AccountSelectProps {
  accounts: AccountOption[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export default function AccountSelect({
  accounts,
  value,
  onChange,
  label,
  placeholder = 'جستجو و انتخاب حساب...',
  required = false,
}: AccountSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find((a) => a.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredAccounts = accounts.filter((a) => {
    if (!a.isPostable) return false;
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      a.name.toLowerCase().includes(term) ||
      a.code.includes(term) ||
      (a.accountKind && a.accountKind.toLowerCase().includes(term))
    );
  });

  const getAccountIcon = (kind: string, cls: string) => {
    if (kind === 'CASH') return <Wallet className="w-3.5 h-3.5" />;
    if (kind === 'BANK') return <Building2 className="w-3.5 h-3.5" />;
    if (kind === 'PERSON' || kind === 'COUNTERPARTY') return <User className="w-3.5 h-3.5" />;
    if (cls === 'INCOME') return <TrendingUp className="w-3.5 h-3.5" />;
    return <TrendingDown className="w-3.5 h-3.5" />;
  };

  const getKindBadge = (kind: string, cls: string) => {
    if (kind === 'CASH') return 'صندوق نقدی';
    if (kind === 'BANK') return 'حساب بانکی';
    if (kind === 'PERSON' || kind === 'COUNTERPARTY') return 'طرف‌حساب';
    if (cls === 'INCOME') return 'سرفصل درآمد';
    if (cls === 'EXPENSE') return 'سرفصل هزینه';
    return 'سرفصل مالی';
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>}

      {/* باکس انتخاب حساب */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 text-xs bg-slate-50 border rounded-xl px-3 py-2.5 transition text-right cursor-pointer ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {selectedAccount ? (
          <div className="flex items-center gap-2 truncate">
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 text-xs"
              style={{ backgroundColor: selectedAccount.color || '#3B82F6' }}
            >
              {getAccountIcon(selectedAccount.accountKind, selectedAccount.accountClass)}
            </span>
            <div className="truncate text-right">
              <span className="font-bold text-slate-800">{selectedAccount.name}</span>
              <span className="mr-1.5 text-2xs font-mono font-bold bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded">
                کد: {selectedAccount.code}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* منوی جستجوی داینامیک */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* ورودی جستجو */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در نام، کد حساب، بانک..."
                className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>

          {/* لیست حساب‌ها */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                حسابی با این عنوان یا کد پیدا نشد.
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const isSelected = acc.id === value;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      onChange(acc.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-right transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 border border-blue-200/80 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 text-xs"
                        style={{ backgroundColor: acc.color || '#3B82F6' }}
                      >
                        {getAccountIcon(acc.accountKind, acc.accountClass)}
                      </span>
                      <div className="truncate text-right">
                        <div className="text-xs font-semibold text-slate-800">{acc.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-3xs font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                            کد: {acc.code}
                          </span>
                          <span className="text-3xs text-slate-400">
                            {getKindBadge(acc.accountKind, acc.accountClass)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {acc.currentBalance !== undefined && (
                        <span className="text-2xs font-mono text-slate-500">
                          {formatRial(acc.currentBalance)}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
