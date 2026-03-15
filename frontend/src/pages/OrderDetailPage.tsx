// src/pages/OrderDetailPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../services/api';
import { Order, OrderTimeline, OrderStatus } from '../types';
import { Spinner, Badge } from '../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_STEPS: OrderStatus[] = ['created', 'assigned', 'in_transit', 'completed'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: orderRes, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
  });

  const { data: timelineRes } = useQuery({
    queryKey: ['order-timeline', id],
    queryFn: () => ordersApi.getTimeline(id!),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['order-timeline', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update');
    },
  });

  const order: Order | undefined = orderRes?.data?.data;
  const timeline: OrderTimeline[] = timelineRes?.data?.data ?? [];

  if (isLoading || !order) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/orders')} 
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Shipment Details</h1>
              <Badge variant={isCancelled ? 'danger' : order.status === 'completed' ? 'success' : 'info'}>
                {order.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-slate-500 text-xs font-mono mt-1">REF: {order.id}</p>
          </div>
        </div>
        
        {['assigned', 'in_transit'].includes(order.status) && (
          <div className="flex gap-2">
            {order.status === 'assigned' && (
              <button
                onClick={() => updateStatusMutation.mutate('in_transit')}
                disabled={updateStatusMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
              >
                Start Delivery
              </button>
            )}
            {order.status === 'in_transit' && (
              <button
                onClick={() => updateStatusMutation.mutate('completed')}
                disabled={updateStatusMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
              >
                Mark Accomplished
              </button>
            )}
            <button
              onClick={() => { if(confirm('Cancel this shipment?')) updateStatusMutation.mutate('cancelled'); }}
              disabled={updateStatusMutation.isPending}
              className="bg-slate-800 border border-slate-700 text-red-400 hover:bg-red-500/10 text-xs font-bold px-4 py-2 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Routing Manifest</h2>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-500 uppercase">Estimated:</span>
                 <span className="text-orange-400 font-mono text-xs">{order.estimated_time ? `${order.estimated_time}m` : 'N/A'}</span>
              </div>
            </div>
            
            <div className="p-6 space-y-8 relative">
              {/* Vertical Path Line */}
              <div className="absolute left-[39px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-slate-700 via-orange-500 to-emerald-500" />
              
              <div className="flex gap-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 text-lg">
                  🏭
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Pickup Information</p>
                  <p className="text-white font-medium text-lg leading-tight">{order.pickup_location}</p>
                </div>
              </div>

              <div className="flex gap-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-orange-500/50 flex items-center justify-center text-slate-400 text-lg">
                  📦
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Logistics Detail</p>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[10px] text-slate-600 uppercase block">Distance</span>
                      <span className="text-slate-200 font-mono">{order.distance ? `${order.distance} km` : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-emerald-500/50 flex items-center justify-center text-slate-400 text-lg">
                  📍
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Final Destination</p>
                  <p className="text-white font-medium text-lg leading-tight">{order.drop_location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Event History</h2>
            <div className="space-y-6">
              {timeline.map((t, i) => (
                <div key={t.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 border-slate-900 shadow-lg ${
                      i === 0 ? 'bg-orange-500' : 'bg-slate-700'
                    }`} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-slate-800 my-1" />}
                  </div>
                  <div className="pb-2 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white capitalize leading-none">
                        {t.status.replace('_', ' ')}
                      </p>
                      <time className="text-[10px] text-slate-600 font-bold">
                        {format(new Date(t.timestamp), 'MMM d · HH:mm')}
                      </time>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Verified by { (t as any).changed_by_user?.name || 'System' }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status Stepper Card */}
          {!isCancelled && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Current Progress</h2>
              <div className="space-y-6">
                {STATUS_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < currentStep ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg'
                      : i === currentStep ? 'bg-orange-500 text-white shadow-orange-500/20 shadow-lg'
                      : 'bg-slate-800 text-slate-600'
                    }`}>
                      {i < currentStep ? '✓' : i + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-bold uppercase tracking-tight ${
                        i <= currentStep ? 'text-white' : 'text-slate-600'
                      }`}>
                        {step.replace('_', ' ')}
                      </p>
                      {i === currentStep && (
                        <p className="text-[10px] text-orange-500 font-bold animate-pulse">CURRENT ACTIVE STATE</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Entity */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Assigned Personnel</h2>
            {order.driver ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl shadow-inner">
                    👤
                  </div>
                  <div>
                    <p className="text-white font-bold">{order.driver.name}</p>
                    <p className="text-xs text-slate-500">{order.driver.phone}</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-2xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Assigned Vehicle</p>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-mono text-xs">{(order.driver as any).vehicle?.plate_number || 'TRK-XXXX'}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest bg-slate-700 px-1.5 py-0.5 rounded">
                      {(order.driver as any).vehicle?.type || 'STANDARD'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-slate-600 text-xs italic">Unassigned Resources</p>
                <button 
                  onClick={() => navigate('/orders')}
                  className="mt-3 text-orange-500 text-[10px] font-bold uppercase hover:underline"
                >
                  Assign via Board →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
