import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { RadarDatum } from "@/lib/stats";

function TooltipBox({ active, payload }: { active?: boolean; payload?: { payload: RadarDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-surface2 px-3 py-2 text-xs shadow-card">
      <div className="mb-1 font-bold text-white">{d.axis}</div>
      <div className="text-sober">맨정신: {d.soberRaw}</div>
      <div className="text-drunk">
        지금: {d.nowRaw} <span className="text-muted">(평소의 {d.now}%)</span>
      </div>
    </div>
  );
}

export function ResultRadar({ data, animate = true }: { data: RadarDatum[]; animate?: boolean }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#2A3354" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#C4CAE0", fontSize: 11, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 150]} tick={false} axisLine={false} />
          <Radar name="맨정신의 나 (기준 100)" dataKey="sober" stroke="#3DA9FF" fill="#3DA9FF" fillOpacity={0.15} strokeWidth={2} isAnimationActive={animate} />
          <Radar name="지금의 나" dataKey="now" stroke="#FF8A3D" fill="#FF8A3D" fillOpacity={0.35} strokeWidth={2.5} isAnimationActive={animate} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#C4CAE0" }} />
          <Tooltip content={<TooltipBox />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
