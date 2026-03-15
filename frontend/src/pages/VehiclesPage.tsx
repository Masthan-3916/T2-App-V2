// src/pages/VehiclesPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi } from '../services/api';
import { Vehicle, VehicleType } from '../types';
import { Spinner, Badge, Modal, Input, Select, EmptyState } from '../components/ui';
import toast from 'react-hot-toast';

const VEHICLE_ICONS: Record<VehicleType, string> = {
  bike: '🏍️', car: '🚗', van: '🚐', truck: '🚚',
};

interface VehicleModalProps {
  vehicle?: Vehicle;
  onClose: () => void;
  onSuccess: () => void;
}

function VehicleModal({ vehicle, onClose, onSuccess }: VehicleModalProps) {
  const [form, setForm] = useState({
    plate_number: vehicle?.plate_number ?? '',
    capacity: vehicle?.capacity?.toString() ?? '',
    type: vehicle?.type ?? 'van' as VehicleType,
  });

  const mutation = useMutation({
    mutationFn: () =>
      vehicle
        ? vehiclesApi.update(vehicle.id, { ...form, capacity: parseFloat(form.capacity) })
        : vehiclesApi.create({ ...form, capacity: parseFloat(form.capacity) }),
    onSuccess: () => {
      toast.success(vehicle ? 'Vehicle updated' : 'Vehicle created');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Operation failed');
    },
  });

  return (
    <Modal title={vehicle ? 'Edit Vehicle' : 'Add Vehicle'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
        <Input
          label="Plate Number"
          value={form.plate_number}
          onChange={e => setForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))}
          placeholder="TRK-001"
          required
        />
        <Select
          label="Vehicle Type"
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value as VehicleType }))}
        >
          {(['bike', 'car', 'van', 'truck'] as VehicleType[]).map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </Select>
        <Input
          label="Capacity (kg)"
          type="number"
          value={form.capacity}
          onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
          placeholder="500"
          min={0}
          required
        />
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-sm text-slate-400">Cancel</button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium text-white disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function VehiclesPage() {
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const qc = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list({ limit: 100 }),
  });

  const vehicles: Vehicle[] = res?.data?.data ?? [];

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.delete(id),
    onSuccess: () => {
      toast.success('Vehicle deactivated');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['vehicles'] });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vehicles</h1>
          <p className="text-slate-400 text-sm mt-1">{vehicles.length} assets in fleet</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95"
        >
          + Add Vehicle
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
      ) : vehicles.length === 0 ? (
        <EmptyState title="Empty Fleet" description="Get started by adding your first vehicle." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vehicles.map(v => (
            <div key={v.id} className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg hover:shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">
                  {VEHICLE_ICONS[v.type]}
                </div>
                <Badge variant={v.status === 'available' ? 'success' : v.status === 'in_use' ? 'warning' : 'muted'}>
                  {v.status.replace('_', ' ')}
                </Badge>
              </div>

              <div>
                <h3 className="text-white font-mono font-bold tracking-wider">{v.plate_number}</h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-tight font-bold">
                  {v.type} · {v.capacity}kg Max Load
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 uppercase font-bold tracking-tighter">Current Op:</span>
                  <span className="text-slate-300 font-medium truncate">
                    {(v as any).driver?.name ?? 'Available for assignment'}
                  </span>
                </div>
              </div>

              {/* Hover actions */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setSelected(v); setModal('edit'); }}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                </button>
                <button
                  onClick={() => { if(confirm('Remove this vehicle?')) deactivateMutation.mutate(v.id); }}
                  className="p-1.5 rounded-lg bg-slate-800 text-red-500/70 hover:text-red-400 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'create' && <VehicleModal onClose={() => setModal(null)} onSuccess={() => { setModal(null); refresh(); }} />}
      {modal === 'edit' && selected && <VehicleModal vehicle={selected} onClose={() => setModal(null)} onSuccess={() => { setModal(null); refresh(); }} />}
    </div>
  );
}
