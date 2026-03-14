'use client';

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { Transaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect } from 'react';

const chartConfig = {
  income: {
    label: 'Income',
    color: 'hsl(var(--chart-2))',
  },
  expense: {
    label: 'Expense',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

type ChartDataPoint = { date: string; income: number; expense: number };

interface CashPulseChartProps {
  transactions: Transaction[] | null;
  isLoading: boolean;
}

export default function CashPulseChart({ transactions, isLoading }: CashPulseChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (!mounted) return [];
    
    const data: ChartDataPoint[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      data.push({ date: dateString, income: 0, expense: 0 });
    }

    (transactions || []).forEach(t => {
      const tDate = new Date(t.timestamp);
      const diffDays = Math.floor((today.getTime() - tDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const dateString = tDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const entry = data.find(d => d.date === dateString);
        if (entry) {
          if (t.type === 'income') {
            entry.income += t.amount;
          } else {
            entry.expense += t.amount;
          }
        }
      }
    });

    return data;
  }, [transactions, mounted]);


  if (isLoading || !mounted) {
    return <Skeleton className="h-[250px] w-full" />;
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart accessibilityLayer data={chartData} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value}
        />
        <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(value) => `₦${value.toLocaleString()}`}
            width={80}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Legend verticalAlign="top" height={36} iconType="circle" />
        <Line
          dataKey="income"
          type="monotone"
          stroke="var(--color-income)"
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name="Income"
        />
        <Line
          dataKey="expense"
          type="monotone"
          stroke="var(--color-expense)"
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name="Expense"
        />
      </LineChart>
    </ChartContainer>
  );
}
