import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Percent } from 'lucide-react';
import api from '../../../../services/api';
import ChartCard from '../../../../components/ChartCard/ChartCard';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const buildProfitMarginByMonth = (orders = []) => {
  const currentYear = new Date().getFullYear();
  const monthlyTotals = Array.from({ length: 12 }, (_, index) => ({
    month: MONTH_NAMES[index],
    totalOrderValue: 0,
    totalBudgetPurchase: 0,
    totalActualPurchase: 0,
  }));

  orders.forEach((order) => {
    if (!order?.invoice_date) return;

    const invoiceDate = new Date(order.invoice_date);
    if (invoiceDate.getFullYear() !== currentYear) return;

    const monthIndex = invoiceDate.getMonth();
    monthlyTotals[monthIndex].totalOrderValue += Number(order?.order_value) || 0;
    monthlyTotals[monthIndex].totalBudgetPurchase += Number(order?.budget_purchase_amount) || 0;
    monthlyTotals[monthIndex].totalActualPurchase += Number(order?.actual_purchase_amount) || 0;
  });

  return monthlyTotals.map((monthData) => {
    const { month, totalOrderValue, totalBudgetPurchase, totalActualPurchase } = monthData;

    const plannedProfitMargin =
      totalOrderValue > 0 ? ((totalOrderValue - totalBudgetPurchase) / totalOrderValue) * 100 : 0;
    const actualProfitMargin =
      totalOrderValue > 0 ? ((totalOrderValue - totalActualPurchase) / totalOrderValue) * 100 : 0;

    return {
      month,
      'Planned Profit Margin': Number(plannedProfitMargin.toFixed(2)),
      'Actual Profit Margin': Number(actualProfitMargin.toFixed(2)),
    };
  });
};

export default function ProfitMarginTrendChart() {
  const { data: orders = [], isLoading } = useQuery({
    queryFn: async () => {
      const response = await api.get('/records/order', {
        params: {
          fields: [
            'invoice_date',
            'order_value',
            'budget_purchase_amount',
            'actual_purchase_amount',
          ],
          limit: 5000,
        },
      });
      return response.data?.data || [];
    },
    queryKey: ['orders-profit-margin'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const chartData = useMemo(() => buildProfitMarginByMonth(orders), [orders]);

  return (
    <ChartCard
      icon={Percent}
      title="Profit Margin Trend"
      isEmpty={chartData.length === 0}
    >
      {isLoading ? (
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          Loading profit margin data...
        </p>
      ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 16, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-gray-200)"
              />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={[-100, 100]}
                label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="Planned Profit Margin"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="Actual Profit Margin"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
