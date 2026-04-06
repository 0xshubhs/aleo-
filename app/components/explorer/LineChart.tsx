"use client";

import {
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  count: number;
}

interface ExplorerLineChartProps {
  data: DataPoint[];
  dataKey?: string;
  xKey?: string;
  height?: number;
}

export default function ExplorerLineChart({
  data,
  dataKey = "count",
  xKey = "date",
  height = 260,
}: ExplorerLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLine data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.15)" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: "rgba(0,0,0,0.7)", fontSize: 12 }}
          stroke="rgba(0,0,0,0.2)"
        />
        <YAxis
          tick={{ fill: "rgba(0,0,0,0.7)", fontSize: 12 }}
          stroke="rgba(0,0,0,0.2)"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid rgba(0,0,0,0.2)",
            borderRadius: 8,
          }}
          labelStyle={{ color: "#000" }}
          formatter={(value: number) => [value, dataKey]}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="#000"
          strokeWidth={2}
          dot={false}
        />
      </RechartsLine>
    </ResponsiveContainer>
  );
}
