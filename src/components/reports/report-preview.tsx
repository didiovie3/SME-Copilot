'use client';

import React from 'react';
import type { Transaction, InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ReportType = 'profit-loss' | 'income-expense' | 'inventory-valuation' | 'transaction-history';

interface ReportPreviewProps {
  type: ReportType;
  transactions: Transaction[];
  inventory: InventoryItem[];
}

export default function ReportPreview({ type, transactions, inventory }: ReportPreviewProps) {
  const incomes = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalIncome - totalExpense;

  const cogs = transactions
    .filter(t => t.type === 'expense' && (t.categoryGroup === 'Purchases & Inventory' || t.category === 'Stock Purchase'))
    .reduce((sum, t) => sum + t.amount, 0);
  const grossProfit = totalIncome - cogs;
  const grossMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  if (type === 'profit-loss') {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-[#F4F6F9] border border-[#E5E7EB] space-y-1">
            <p className="text-[10px] font-black text-[#6B7280] uppercase">Total Revenue</p>
            <p className="text-xl font-black text-[#0D1B2A]">₦{totalIncome.toLocaleString()}</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#F4F6F9] border border-[#E5E7EB] space-y-1">
            <p className="text-[10px] font-black text-[#6B7280] uppercase">Total Expenses</p>
            <p className="text-xl font-black text-[#0D1B2A]">₦{totalExpense.toLocaleString()}</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#F4F6F9] border border-[#E5E7EB] space-y-1">
            <p className="text-[10px] font-black text-[#6B7280] uppercase">Gross Margin</p>
            <p className="text-xl font-black text-[#0D1B2A]">{grossMargin.toFixed(1)}%</p>
          </div>
          <div className={cn(
            "p-6 rounded-2xl border space-y-1",
            netIncome >= 0 ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FEF2F2] border-[#FECACA]"
          )}>
            <p className="text-[10px] font-black text-[#6B7280] uppercase">Net Profit</p>
            <p className={cn("text-xl font-black", netIncome >= 0 ? "text-[#15803D]" : "text-[#B91C1C]")}>
              ₦{netIncome.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#6B7280]">Detailed Breakdown</h4>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-slate-50/50"><td colSpan={2} className="py-2 px-2 text-[10px] font-black uppercase text-slate-400">Income</td></tr>
              {Array.from(new Set(incomes.map(t => t.categoryName || t.category))).sort().map(cat => {
                const amount = incomes.filter(t => (t.categoryName || t.category) === cat).reduce((sum, t) => sum + t.amount, 0);
                return (
                  <tr key={cat} className="group">
                    <td className="py-3 px-2 font-bold text-slate-600">{cat}</td>
                    <td className="py-3 px-2 text-right font-black text-[#0D1B2A]">₦{amount.toLocaleString()}</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50/50"><td colSpan={2} className="py-2 px-2 text-[10px] font-black uppercase text-slate-400">Expenses</td></tr>
              {Array.from(new Set(expenses.map(t => t.categoryName || t.category))).sort().map(cat => {
                const amount = expenses.filter(t => (t.categoryName || t.category) === cat).reduce((sum, t) => sum + t.amount, 0);
                return (
                  <tr key={cat} className="group">
                    <td className="py-3 px-2 font-bold text-slate-600">{cat}</td>
                    <td className="py-3 px-2 text-right font-black text-[#B91C1C]">₦{amount.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'transaction-history') {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50/50 border-b-2 border-slate-100">
              <tr className="font-black uppercase text-[#6B7280]">
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Description</th>
                <th className="text-right p-4">Amount</th>
                <th className="text-right p-4">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center italic text-slate-400">No transactions found for the selected period.</td></tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 whitespace-nowrap">{format(new Date(t.timestamp), 'MMM dd, yyyy')}</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                        t.type === 'income' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-700">{t.categoryName || t.category}</td>
                    <td className="p-4 max-w-[200px] truncate text-slate-500">{t.description || '-'}</td>
                    <td className={cn("p-4 text-right font-black text-xs", t.type === 'income' ? 'text-[#15803D]' : 'text-[#B91C1C]')}>
                      {t.type === 'income' ? '+' : '-'}₦{t.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-right uppercase text-slate-400 font-bold">{t.paymentMethod}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-6 border-t-2 border-slate-100 grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-right">
            <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Total Income</p>
            <p className="text-lg font-black text-emerald-700">₦{totalIncome.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-right">
            <p className="text-[8px] font-black uppercase text-red-600 tracking-widest">Total Expenses</p>
            <p className="text-lg font-black text-red-700">₦{totalExpense.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-right">
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Net Position</p>
            <p className="text-lg font-black text-slate-900">₦{netIncome.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'income-expense') {
    const categories = Array.from(new Set(transactions.map(t => t.categoryName || t.category))).sort();
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] border-b pb-2">Category Performance</h4>
            <div className="space-y-3">
              {categories.map(cat => {
                const catAmount = transactions.filter(t => (t.categoryName || t.category) === cat).reduce((sum, t) => sum + t.amount, 0);
                const percentage = totalIncome + totalExpense > 0 ? (catAmount / (totalIncome + totalExpense)) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-600">{cat}</span>
                      <span className="text-slate-900">₦{catAmount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", transactions.find(t => (t.categoryName || t.category) === cat)?.type === 'income' ? "bg-emerald-500" : "bg-red-500")}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col justify-center items-center p-10 bg-slate-50 rounded-3xl border border-slate-100 text-center">
            <div className="size-32 rounded-full border-[12px] border-emerald-500 flex items-center justify-center relative">
              <div className="absolute inset-[-12px] rounded-full border-[12px] border-red-500 border-t-transparent border-r-transparent" style={{ transform: `rotate(${(totalIncome / (totalIncome + totalExpense || 1)) * 360}deg)` }} />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-slate-400">Ratio</span>
                <span className="text-lg font-black text-slate-900">
                  {totalIncome + totalExpense > 0 ? ((totalIncome / (totalIncome + totalExpense)) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
            <p className="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Income to Expense Ratio</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'inventory-valuation') {
    const activeInv = inventory.filter(i => !i.isArchived);
    const totalVal = activeInv.reduce((sum, item) => {
      const val = item.type === 'goods' ? (item.currentStock || 0) * (item.unitCost || 0) : (item.value || 0);
      return sum + val;
    }, 0);

    return (
      <div className="space-y-8">
        <div className="p-8 rounded-3xl bg-[#0D1B2A] text-white flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Asset Value</p>
            <p className="text-4xl font-black tabular-nums">₦{totalVal.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">Managed Items</p>
            <p className="text-2xl font-black">{activeInv.length}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50/50 border-b-2 border-slate-100">
              <tr className="font-black uppercase text-[#6B7280]">
                <th className="text-left p-4">Item Name</th>
                <th className="text-center p-4">Type</th>
                <th className="text-center p-4">Stock</th>
                <th className="text-center p-4">Unit Cost/Value</th>
                <th className="text-right p-4">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeInv.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center italic text-slate-400">Your inventory is empty.</td></tr>
              ) : (
                activeInv.map(item => {
                  const val = item.type === 'goods' ? (item.currentStock || 0) * (item.unitCost || 0) : (item.value || 0);
                  const price = item.type === 'goods' ? item.unitCost : item.value;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/30">
                      <td className="p-4 font-bold text-[#0D1B2A]">{item.itemName}</td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[8px] font-black uppercase text-slate-500">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4 text-center font-black text-slate-700">{item.type === 'goods' ? item.currentStock : '∞'}</td>
                      <td className="p-4 text-center text-slate-500">₦{price?.toLocaleString()}</td>
                      <td className="p-4 text-right font-black text-slate-900 text-xs">
                        ₦{val.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
