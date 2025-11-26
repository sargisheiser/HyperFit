import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import NeonCard from './NeonCard'

export default function PerformanceChart({ data, title, subtitle }) {
  // Ensure data is an array and has valid values
  const chartData = Array.isArray(data) && data.length > 0 
    ? data.map(item => ({
        label: item?.label ?? '',
        value: typeof item?.value === 'number' ? item.value : 0
      }))
    : [{ label: '', value: 0 }]

  return (
    <NeonCard className="col-span-1 w-full">
      <div className="flex w-full flex-col gap-4 rounded-[32px] bg-gradient-to-br from-[#101612]/85 via-[#0a140e]/85 to-[#060907]/90 p-6 text-[#b6fbd4] shadow-[0_0_38px_rgba(0,255,127,0.1)]">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[#8cffc7]">{subtitle}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
        </div>
        <div className="w-full min-w-[220px]">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF7F" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#00FF7F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#182218" />
              <XAxis dataKey="label" stroke="rgba(223,255,241,0.4)" tickLine={false} />
              <YAxis stroke="rgba(223,255,241,0.4)" tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#09140d',
                  border: '1px solid rgba(0,255,127,0.3)',
                  borderRadius: '16px',
                  color: '#fff',
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#00FF7F" fillOpacity={1} fill="url(#colorPrimary)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </NeonCard>
  )
}









