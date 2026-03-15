// src/pages/DashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import { DashboardSummary } from '../types';
import { Badge, Spinner } from '../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  theme: 'blue' | 'orange' | 'emerald' | 'violet';
  icon: React.ReactNode;
}

const THEMES = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20 shadow-blue-500/5' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20 shadow-orange-500/5' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20 shadow-emerald-500/5' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20 shadow-violet-500/5' },
};

function MetricCard({ title, value, subtitle, theme, icon }: MetricCardProps) {
  const t = THEMES[theme];
  return (
    <div className={`relative overflow-hidden bg-slate-900 border ${t.border} rounded-3xl p-6 shadow-2xl group transition-all hover:scale-[1.02]`}>
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <div className="scale-[2.5]">{icon}</div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-2xl ${t.bg} flex items-center justify-center ${t.text} shadow-inner`}>
          {icon}
        </div>
        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-4xl font-black text-white tracking-tighter">{value}</p>
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
      </div>
      {subtitle && <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-tight">{subtitle}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: summaryRes, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
    refetchInterval: 30_000,
  });

  const { data: metricsRes } = useQuery({
    queryKey: ['order-metrics'],
    queryFn: dashboardApi.orderMetrics,
    refetchInterval: 60_000,
  });

  const { data: utilizationRes } = useQuery({
    queryKey: ['driver-utilization'],
    queryFn: dashboardApi.driverUtilization,
  });

  const isForbidden = (summaryError as any)?.response?.status === 403;

  const summary: DashboardSummary | undefined = summaryRes?.data?.data;
  const metrics = metricsRes?.data?.data;
  const utilization = utilizationRes?.data?.data ?? [];

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border border-red-500/20">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Access Restricted</h2>
        <p className="text-slate-400 text-sm leading-relaxed px-10">Your operational clearance does not permit access to the global control center. Please switch to your allocated portal.</p>
        <button 
          onClick={() => window.location.href = '/driver-portal'} 
          className="px-6 py-3 bg-white text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-100 transition-all"
        >
          Go to Driver Portal
        </button>
      </div>
    );
  }

  if (summaryError || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4">
        <p className="text-sm font-bold uppercase tracking-widest">Global Grid Offline</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">Reconnect</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Control Center</h1>
          <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-[0.2em]">Operational Real-Time Intelligence</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Live Data</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Field Personnel"
          value={summary.drivers.active}
          subtitle={`${summary.drivers.on_trip} Active Transfers`}
          theme="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <MetricCard
          title="Ongoing Manifests"
          value={summary.orders.in_transit + summary.orders.assigned}
          subtitle={`${summary.orders.created} Queueing`}
          theme="orange"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <MetricCard
          title="Success Rate"
          value={summary.orders.completed}
          subtitle="Transactions Completed Today"
          theme="emerald"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard
          title="Fleet Capacity"
          value={summary.vehicles.available}
          subtitle={`${summary.vehicles.in_use} Units Engaged`}
          theme="violet"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order trends */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Transaction Volume History</h3>
            <Badge variant="info">Last 7 Cycles</Badge>
          </div>
          <div className="flex-1 min-h-[300px]">
            {metrics?.daily_metrics ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.daily_metrics} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={d => d.slice(5).replace('-', '/')} 
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }}
                    labelStyle={{ color: '#94a3b8', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}
                  />
                  <Bar dataKey="created" fill="#f97316" radius={[6, 6, 6, 6]} name="Incoming" barSize={12} />
                  <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 6, 6]} name="Fulfilled" barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-700 text-xs font-black uppercase tracking-widest italic">Data Stream Offline</div>
            )}
          </div>
          <div className="mt-6 flex gap-8 border-t border-slate-800/50 pt-6">
            <div>
               <p className="text-[10px] text-slate-600 font-black uppercase mb-1">Grid Efficiency</p>
               <p className="text-white font-black text-xl">{metrics?.avg_delivery_time_min || 0}<span className="text-slate-500 text-xs ml-1">MIN AVG.</span></p>
            </div>
            <div>
               <p className="text-[10px] text-slate-600 font-black uppercase mb-1">Peak Volume</p>
               <p className="text-white font-black text-xl">{Math.max(...(metrics?.daily_metrics?.map(m => m.created) || [0]))}<span className="text-slate-500 text-xs ml-1">MAX/DAY</span></p>
            </div>
          </div>
        </div>

        {/* Status distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col">
           <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Manifest States</h3>
           <div className="space-y-4 flex-1">
             {[
               { label: 'Unassigned', value: summary.orders.created, color: 'bg-slate-800' },
               { label: 'Dispatched', value: summary.orders.assigned, color: 'bg-blue-500' },
               { label: 'In Transit', value: summary.orders.in_transit, color: 'bg-orange-500' },
               { label: 'Delivered', value: summary.orders.completed, color: 'bg-emerald-500' },
               { label: 'Voided', value: summary.orders.cancelled, color: 'bg-red-500' },
             ].map(s => (
               <div key={s.label} className="group">
                 <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                    <span className="text-sm font-black text-white">{s.value}</span>
                 </div>
                 <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${s.color} transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                      style={{ width: `${(s.value / (summary.orders.total || 1)) * 100}%` }}
                    />
                 </div>
               </div>
             ))}
           </div>
           
           <div className="mt-8 p-6 bg-slate-800/20 rounded-3xl border border-slate-800/50">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Total Managed Volume</p>
              <p className="text-3xl font-black text-white tracking-tighter">{summary.orders.total}</p>
           </div>
        </div>
      </div>
    </div>
  );
}
