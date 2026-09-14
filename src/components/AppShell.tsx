'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import TransactionModal from '@/components/TransactionModal';
import { AccountOption } from '@/types';
import AccountModal from '@/components/AccountModal';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [isAccOpen, setIsAccOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [todayJalali, setTodayJalali] = useState<string>('');

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setTodayJalali(data.todayJalali);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchDashboard();
  }, []);

  const handleDataRefresh = () => {
    fetchAccounts();
    fetchDashboard();
    // فراخوانی رویداد سفارشی برای صفحه جاری
    window.dispatchEvent(new Event('refresh-financial-data'));
  };

  return (
    <div className="flex min-h-screen bg-slate-100/70">
      <Sidebar onOpenTransaction={() => setIsTxOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          todayJalali={todayJalali}
          onOpenTransaction={() => setIsTxOpen(true)}
          onOpenAccount={() => setIsAccOpen(true)}
        />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>

      <TransactionModal
        isOpen={isTxOpen}
        onClose={() => setIsTxOpen(false)}
        onSuccess={handleDataRefresh}
        accounts={accounts}
        todayJalali={todayJalali}
      />

      <AccountModal
        isOpen={isAccOpen}
        onClose={() => setIsAccOpen(false)}
        onSuccess={handleDataRefresh}
        accounts={accounts}
      />
    </div>
  );
}
