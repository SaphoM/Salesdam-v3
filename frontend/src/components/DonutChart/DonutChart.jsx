import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

const DEFAULT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#4793AF', '#FFC470', '#DD5746'];

export default function DonutChart({
  data = [],
  colors = DEFAULT_COLORS,
  innerRadius = 60,
  outerRadius = 100,
}) {
  if (data.length === 0) {
    return null;
  }

  const chartColors = colors.slice(0, data.length);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}`}
        >
          {chartColors.map((color, index) => (
            <Cell key={`cell-${index}`} fill={color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
