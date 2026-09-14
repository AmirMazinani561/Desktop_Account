'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronRight, ChevronLeft, Clock, Sparkles } from 'lucide-react';
import {
  fromDate,
  parseJalali,
  formatJalali,
  jalaliMonthLength,
  JALALI_MONTH_NAMES,
  toPersianDigits,
} from '../../lib/jalali';

interface ShamsiDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
}

export default function ShamsiDatePicker({
  value,
  onChange,
  label = 'تاریخ شمسی',
  placeholder = '1405/06/23',
}: ShamsiDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // استخراج سال، ماه، روز از مقدار ورودی یا تاریخ امروز
  const getInitial = () => {
    try {
      if (value) {
        const p = parseJalali(value);
        return { year: p.jy, month: p.jm, day: p.jd };
      }
    } catch {}
    const t = fromDate(new Date());
    return { year: t.jy, month: t.jm, day: t.jd };
  };

  const initial = getInitial();
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);

  useEffect(() => {
    try {
      if (value) {
        const p = parseJalali(value);
        setViewYear(p.jy);
        setViewMonth(p.jm);
        setSelectedDay(p.jd);
      }
    } catch {}
  }, [value]);

  // بستن منو با کلیک بیرون
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysCount = jalaliMonthLength(viewYear, viewMonth);
  const today = fromDate(new Date());

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    const formatted = formatJalali(viewYear, viewMonth, day);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleQuickToday = () => {
    setViewYear(today.jy);
    setViewMonth(today.jm);
    setSelectedDay(today.jd);
    onChange(today.formattedJalali);
    setIsOpen(false);
  };

  const handleQuickYesterday = () => {
    const yestDate = new Date(Date.now() - 86400000);
    const yest = fromDate(yestDate);
    setViewYear(yest.jy);
    setViewMonth(yest.jm);
    setSelectedDay(yest.jd);
    onChange(yest.formattedJalali);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>}

      {/* ورودی اصلی */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer font-mono font-semibold"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-blue-600 transition"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {/* پاپ‌آپ تقویم */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-72 animate-in fade-in zoom-in-95 duration-150">
          {/* سربرگ کنترل سال و ماه */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              title="ماه بعد"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
              >
                {JALALI_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold font-mono focus:outline-none"
              >
                {[1400, 1401, 1402, 1403, 1404, 1405, 1406, 1407, 1408, 1409, 1410].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              title="ماه قبل"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* شبکه روزهای ماه */}
          <div className="grid grid-cols-7 gap-1.5 text-center mb-3">
            {Array.from({ length: daysCount }, (_, i) => i + 1).map((day) => {
              const isSelected =
                viewYear === initial.year && viewMonth === initial.month && day === selectedDay;
              const isToday = viewYear === today.jy && viewMonth === today.jm && day === today.jd;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isToday
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-extrabold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* دکمه‌های انتخاب سریع */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs">
            <button
              type="button"
              onClick={handleQuickToday}
              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-bold transition flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              <span>امروز ({today.jd} {today.monthName})</span>
            </button>
            <button
              type="button"
              onClick={handleQuickYesterday}
              className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md font-medium transition"
            >
              دیروز
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
