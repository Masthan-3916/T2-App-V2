// src/pages/OrdersPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi, driversApi } from '../services/api';
import { Order, Driver, OrderStatus } from '../types';
import { Spinner, Badge, Modal, Input, Select, EmptyState } from '../components/ui';
import toast from 'react-hot-toast';

function CreateOrderModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    pickup_location: '',
    drop_location: '',
    distance: '',
  });

  const mutation = useMutation({
    mutationFn: () => ordersApi.create({
      ...form,
      distance: form.distance ? parseFloat(form.distance) : undefined,
    }),
    onSuccess: () => { toast.success('Order created'); onSuccess(); },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create');
    },
  });

  return (
    <Modal title="Create New Order" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
        <Input
          label="Pickup Address"
          value={form.pickup_location}
          onChange={e => setForm(f => ({ ...f, pickup_location: e.target.value }))}
          placeholder="Warehouse A, 123 Main St"
          required
        />
        <Input
          label="Drop-off Address"
          value={form.drop_location}
          onChange={e => setForm(f => ({ ...f, drop_location: e.target.value }))}
          placeholder="Client Office, 456 Market St"
          required
        />
        <Input
          label="Distance (km) — Estimate"
          type="number"
          value={form.distance}
          onChange={e => setForm(f => ({ ...f, distance: e.target.value }))}
          placeholder="5.2"
          min={0}
          step={0.1}
        />
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-sm text-slate-400">Cancel</button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium text-white disabled:opacity-50"
          >
            {mutation.isPending ? 'Processing...' : 'Create Order'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AssignDriverModal({ order, onClose, onSuccess }: { order: Order; onClose: () => void; onSuccess: () => void }) {
  const [driverId, setDriverId] = useState('');
  const { data: driversRes } = useQuery({
    queryKey: ['drivers', 'active'],
    queryFn: () => driversApi.list({ status: 'active', limit: 100 }),
  });
  const drivers: Driver[] = driversRes?.data?.data ?? [];
  const eligible = drivers.filter(d => d.vehicle_id);

  const mutation = useMutation({
    mutationFn: () => ordersApi.assignDriver(order.id, driverId),
    onSuccess: () => { toast.success('Driver assigned'); onSuccess(); },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign');
    },
  });

  return (
    <Modal title="Dispatch Driver" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Target Order</p>
          <p className="text-white text-sm font-medium truncate">{order.pickup_location} → {order.drop_location}</p>
        </div>
        
        <Select
          label="Available Drivers (with vehicles)"
          value={driverId}
          onChange={e => setDriverId(e.target.value)}
        >
          <option value="">Choose a driver...</option>
          {eligible.map(d => (
            <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
          ))}
        </Select>

        {eligible.length === 0 && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
            <p className="text-xs text-amber-500">No active drivers found. Check driver status and vehicle assignments.</p>
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-sm text-slate-400">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!driverId || mutation.isPending}
            className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium text-white disabled:opacity-50"
          >
            Dispatch
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function OrdersPage() {
  const [modal, setModal] = useState<'create' | 'assign' | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => ordersApi.list({ status: statusFilter || undefined, limit: 50 }),
    refetchInterval: 15_000,
  });
  const orders: Order[] = res?.data?.data ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['orders'] });

  const getStatusVariant = (status: OrderStatus) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_transit': return 'warning';
      case 'assigned': return 'info';
      case 'cancelled': return 'danger';
      default: return 'muted';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Order Board</h1>
          <p className="text-slate-400 text-sm mt-1">{orders.length} active shipments</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Create Order
        </button>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
        {['', 'created', 'assigned', 'in_transit', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as OrderStatus | '')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === s
                ? 'bg-slate-800 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {s === '' ? 'All Orders' : s.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
        ) : orders.length === 0 ? (
          <EmptyState title="No Shipments" description={statusFilter ? `No orders found with status "${statusFilter}"` : "The order board is empty. Create your first delivery task."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/20">
                  {['Reference', 'Manifest', 'Status', 'Logistics', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-orange-500 font-bold uppercase tracking-tighter">#{o.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-slate-500">{new Date(o.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                          <span className="text-white font-medium text-xs truncate max-w-[200px]">{o.pickup_location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          <span className="text-slate-400 text-xs truncate max-w-[200px]">{o.drop_location}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusVariant(o.status)}>
                        {o.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-slate-300 text-xs font-medium">
                          {o.driver?.name ?? <span className="text-slate-500 italic">Pending Dispatch</span>}
                        </span>
                        {o.estimated_time && <span className="text-[10px] text-slate-500 font-bold">~{o.estimated_time} MIN EST.</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-all font-medium text-xs"
                        >
                          Details
                        </button>
                        {o.status === 'created' && (
                          <button
                            onClick={() => { setSelected(o); setModal('assign'); }}
                            className="px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all font-bold text-xs"
                          >
                            Dispatch
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === 'create' && <CreateOrderModal onClose={() => setModal(null)} onSuccess={() => { setModal(null); refresh(); }} />}
      {modal === 'assign' && selected && <AssignDriverModal order={selected} onClose={() => setModal(null)} onSuccess={() => { setModal(null); refresh(); }} />}
    </div>
  );
}
