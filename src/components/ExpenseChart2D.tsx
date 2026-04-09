import { memo, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ExpenseChart2DProps {
  data: { name: string; value: number; color?: string; amount?: string }[];
}

function ExpenseChart2D({ data }: ExpenseChart2DProps) {
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      displayValue: d.value
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="boarding-pass p-3 shadow-2xl" style={{ background: 'rgba(16,19,27,0.95)', backdropFilter: 'blur(8px)' }}>
          <p className="dot-matrix text-[8px] mb-1" style={{ color: 'var(--amber)' }}>{item.name}</p>
          <p className="text-sm font-bold text-white" style={{ fontFamily: 'DM Mono' }}>${item.value.toFixed(2)}</p>
          <div className="mt-2 dot-matrix text-[6px] opacity-40">SECTOR_VERIFIED</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barSize={40}
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffc188" stopOpacity={0.8} />
              <stop offset="90%" stopColor="#f0a050" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="name"
            axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
            tickLine={false}
            tick={{ fill: '#534438', fontSize: 8, fontFamily: 'DM Mono' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#534438', fontSize: 8, fontFamily: 'DM Mono' }}
            hide
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />

          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
            animationBegin={100}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || 'url(#barGradient)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* HUD Elements */}
      <div className="absolute top-2 right-10 flex gap-4 opacity-30">
        <div className="dot-matrix text-[6px] flex items-center gap-1">
          <div className="w-1 h-1 rounded-full" style={{ background: 'var(--amber)' }} />
          LIVE_DATA
        </div>
        <div className="dot-matrix text-[6px] flex items-center gap-1">
          <div className="w-1 h-1 rounded-full" style={{ background: 'var(--cyan)' }} />
          PROJECTS
        </div>
      </div>
    </div>
  );
}

export default memo(ExpenseChart2D);
