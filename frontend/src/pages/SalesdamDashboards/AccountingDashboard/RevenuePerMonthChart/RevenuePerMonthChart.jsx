import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import ChartCard from '../../../../components/ChartCard/ChartCard';
import styles from './RevenuePerMonthChart.module.css';

const getMonthNumber = (monthStr) => {
  if (!monthStr || typeof monthStr !== 'string') return 1;
  const num = parseInt(monthStr, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  return 1;
};

const sortByFiscalYear = (items, fiscalYearStartMonth = 1) => {
  if (!items || items.length === 0) return items;

  return [...items].sort((a, b) => {
    const monthA = getMonthNumber(a.month);
    const monthB = getMonthNumber(b.month);

    const offsetA = monthA >= fiscalYearStartMonth ? monthA - fiscalYearStartMonth : monthA + 12 - fiscalYearStartMonth;
    const offsetB = monthB >= fiscalYearStartMonth ? monthB - fiscalYearStartMonth : monthB + 12 - fiscalYearStartMonth;

    return offsetA - offsetB;
  });
};

export default function RevenuePerMonthChart({ data, formatCurrency, fiscalYearStartMonth = 1 }) {
  const [chartMode, setChartMode] = useState('line');
  const sortedData = sortByFiscalYear(data, fiscalYearStartMonth);

  const toggleButton = (
    <button
      className={styles.toggleBtn}
      onClick={() =>
        setChartMode((m) => (m === 'bar' ? 'line' : 'bar'))
      }
      title="Toggle chart type"
    >
      {chartMode === 'bar' ? (
        <>
          <ToggleLeft size={16} /> Bar
        </>
      ) : (
        <>
          <ToggleRight size={16} /> Line
        </>
      )}
    </button>
  );

  return (
    <ChartCard
      icon={BarChart2}
      title="Total Revenue Per Month"
      headerAction={toggleButton}
      isEmpty={(sortedData || []).length === 0}
    >
      {(sortedData || []).length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          No revenue data available.
        </p>
      ) : (
          <ResponsiveContainer width="100%" height={280}>
            {chartMode === 'bar' ? (
              <BarChart
                data={sortedData}
                margin={{ top: 10, right: 16, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-gray-200)"
                />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar
                  dataKey="Current Year"
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Previous Year"
                  fill="#d1d5db"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart
                data={sortedData}
                margin={{ top: 10, right: 16, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-gray-200)"
                />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Current Year"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="Previous Year"
                  stroke="#9ca3af"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
