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
import styles from './TotalRevenuePerMonthChart.module.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getMonthName = (monthId) => {
  // Handle numeric month (1-12) or string month names
  if (typeof monthId === 'number') {
    return MONTHS[monthId - 1] || monthId;
  }
  // If it's already a month number string like "1", "2", etc.
  const num = parseInt(monthId, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return MONTHS[num - 1];
  }
  // Return as-is if already a full month name
  return monthId;
};

const getMonthNumber = (monthId) => {
  if (typeof monthId === 'number') return monthId;
  const num = parseInt(monthId, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  return 1; // default
};

const createFullYearComparisonData = (data, fiscalYearStartMonth = 1) => {
  // Create maps for current and previous year data
  const currentYearMap = new Map();
  const prevYearMap = new Map();

  if (data && data.length > 0) {
    data.forEach((item) => {
      const monthNum = getMonthNumber(item.month);
      currentYearMap.set(monthNum, item['Current Year'] || 0);
      prevYearMap.set(monthNum, item['Previous Year'] || 0);
    });
  }

  // Get current month (1-12)
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  // Create array of all 12 months in fiscal year order
  const fullYear = [];
  for (let i = 0; i < 12; i++) {
    const monthNum = ((fiscalYearStartMonth - 1 + i) % 12) + 1;
    fullYear.push({
      month: monthNum,
      'Current Year': currentYearMap.get(monthNum) || 0,
      'Previous Year': prevYearMap.get(monthNum) || 0,
      displayName: getMonthName(monthNum),
      isCurrentMonth: monthNum === currentMonth,
    });
  }

  return fullYear;
};

export default function TotalRevenuePerMonthChart({ data, formatCurrency, fiscalYearStartMonth = 1 }) {
  const [chartMode, setChartMode] = useState('line');

  // Create full year comparison data with all 12 months
  const chartData = createFullYearComparisonData(data, fiscalYearStartMonth);

  const renderCustomXAxisTick = (props) => {
    const { x, y, payload, index } = props;
    const isCurrentMonth = chartData[index]?.isCurrentMonth;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="end"
          fill={isCurrentMonth ? 'var(--color-primary)' : '#6b7280'}
          fontSize="11"
          style={{ fontWeight: isCurrentMonth ? 600 : 400 }}
          transform="rotate(-45)"
        >
          {payload.value}
        </text>
      </g>
    );
  };

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
      title="Total Revenue per Month"
      headerAction={toggleButton}
      isEmpty={!chartData || chartData.length === 0}
    >
      {!chartData || chartData.length === 0 ? (
        <p className={styles.empty}>No fiscal year data configured.</p>
      ) : (
          <ResponsiveContainer width="100%" height={280}>
            {chartMode === 'bar' ? (
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 60, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-gray-200)"
                />
                <XAxis
                  dataKey="displayName"
                  tick={renderCustomXAxisTick}
                  height={80}
                  label={{ value: 'Month', position: 'insideBottomRight', offset: -5 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(v)}
                  label={{ value: 'Revenue', angle: -90, position: 'insideLeft' }}
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
                data={chartData}
                margin={{ top: 10, right: 16, left: 60, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-gray-200)"
                />
                <XAxis
                  dataKey="displayName"
                  tick={renderCustomXAxisTick}
                  height={80}
                  label={{ value: 'Month', position: 'insideBottomRight', offset: -5 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(v)}
                  label={{ value: 'Revenue', angle: -90, position: 'insideLeft' }}
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
