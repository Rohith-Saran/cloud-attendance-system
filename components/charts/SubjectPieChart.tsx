"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function SubjectPieChart({ data }: { data: { name: string; value: number }[] }) {
  const colors = ["#4ade80", "#60a5fa", "#fca5a5", "#f59e0b"];
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, "Share"]} />
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} stroke="rgba(248,250,252,0.9)" strokeWidth={2}>
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
