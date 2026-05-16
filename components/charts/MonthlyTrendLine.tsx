"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { month: string; rate: number };

export default function MonthlyTrendLine({ data }: { data: Row[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height={300} minHeight={200}>
        <LineChart data={data} margin={{ left: 8, right: 16, bottom: 4, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
          <XAxis dataKey="month" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis
            stroke="#64748b"
            tick={{ fill: "#64748b", fontSize: 12 }}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value) => [`${Number(value ?? 0)}%`, "Attendance rate"]}
            labelFormatter={(label) => `Month: ${label}`}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 18px 50px rgb(30 41 59 / 14%)",
            }}
          />
          <Line type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
