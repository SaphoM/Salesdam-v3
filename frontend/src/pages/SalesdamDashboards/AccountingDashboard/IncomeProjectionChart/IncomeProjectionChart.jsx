import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Calendar } from 'lucide-react';
import api from '../../../../services/api';
import ChartCard from '../../../../components/ChartCard/ChartCard';
import styles from './IncomeProjectionChart.module.css';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const isPendingOrUnpaid = (record) => {
  const status = String(record?.payment_status || record?.status || '')
    .trim()
    .toLowerCase();
  if (!status) return true;
  return ['pending', 'unpaid', 'due', 'open'].includes(status);
};

const calculateMonthlyTotal = (records, year, month) => {
  if (!records) return 0;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return records
    .filter((record) => {
      const date = new Date(record.payment_date);
      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === year &&
        date.getMonth() === month &&
        (year !== startOfToday.getFullYear() ||
          month !== startOfToday.getMonth() ||
          date >= startOfToday) &&
        isPendingOrUnpaid(record)
      );
    })
    .reduce((total, record) => total + (parseFloat(record.order_value) || 0), 0);
};

export default function IncomeProjectionChart({
  selectedMonth,
  onMonthChange,
  formatCurrency,
}) {
  const [startMonth, setStartMonth] = useState(selectedMonth || '');

  const { data: orders = [], isLoading } = useQuery({
    queryFn: async () => {
      const response = await api.get('/records/order', {
        params: {
          fields: ['invoice_date', 'payment_terms', 'payment_date', 'order_value', 'payment_status'],
          limit: 5000,
        },
      });
      return response.data?.data || [];
    },
    queryKey: ['income-projection-orders'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const generateIncomeData = (start, ordersList) => {
    if (!ordersList || ordersList.length === 0) return [];

    const [year, month] = start.split('-').map(Number);
    const data = [];

    for (let i = 0; i < 3; i++) {
      const date = new Date(year, month - 1 + i, 1);
      const monthYear = date.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });

      const total = calculateMonthlyTotal(
        ordersList,
        date.getFullYear(),
        date.getMonth()
      );

      data.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        displayMonth: monthYear,
        income: Math.round(total),
      });
    }

    return data;
  };

  const handleMonthChange = (e) => {
    const value = e.target.value;
    setStartMonth(value);
    onMonthChange(value);
  };

  const currentStartMonth = startMonth || selectedMonth || '';
  const incomeData = generateIncomeData(currentStartMonth, orders);

  return (
    <div className={styles.cardWrapper}>
      <ChartCard
        icon={Calendar}
        title="Income Projection"
        isEmpty={incomeData.length === 0}
      >
        <div className={styles.dateFilterRow}>
          <div className={styles.dateField}>
            <label className={styles.dateLabel}>From Month</label>
            <input
              type="month"
              className={styles.dateInput}
              value={currentStartMonth}
              onChange={handleMonthChange}
              disabled={isLoading}
            />
          </div>
        </div>
        {isLoading ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Loading income projection...
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={incomeData}
              margin={{ top: 10, right: 16, left: 10, bottom: 80 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-gray-200)"
              />
              <XAxis dataKey="displayMonth" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar
                dataKey="income"
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
