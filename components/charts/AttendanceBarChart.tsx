"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Row = { name: string; present: number; absent: number };

export default function AttendanceBarChart({ data }: { data: Row[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 16, bottom: 4, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 18px 50px rgb(30 41 59 / 14%)",
            }}
          />
          <Bar radius={[8, 8, 2, 2]} dataKey="present" fill="#22c55e" name="Present" />
          <Bar radius={[8, 8, 2, 2]} dataKey="absent" fill="#ef4444" name="Absent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
