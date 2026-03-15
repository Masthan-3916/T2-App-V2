// src/pages/DriversPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi, vehiclesApi } from '../services/api';
import { Driver, Vehicle } from '../types';
import { Spinner, Badge, Modal, Input, Select, EmptyState } from '../components/ui';
import toast from 'react-hot-toast';

interface DriverModalProps {
  driver?: Driver;
  onClose: () => void;
  onSuccess: () => void;
}

function DriverModal({ driver, onClose, onSuccess }: DriverModalProps) {
  const [form, setForm] = useState({
    name: driver?.name ?? '',
    phone: driver?.phone ?? '',
    license_number: driver?.license_number ?? '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      driver ? driversApi.update(driver.id, data) : driversApi.create(data),
    onSuccess: () => {
      toast.success(driver ? 'Driver updated' : 'Driver created');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Operation failed');
    },
  });

  return (
    <Modal title={driver ? 'Edit Driver' : 'Add Driver'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
        <Input
          label="Full Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
        />
        <Input
          label="Phone Number"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          required
        />
        <Input
          label="License Number"
          value={form.license_number}
          onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
          required
        />
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium text-white disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save Driver'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AssignVehicleModal({ driver, onClose, onSuccess }: { driver: Driver; onClose: () => void; onSuccess: () => void }) {
  const [vehicleId, setVehicleId] = useState('');
  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles', 'available'],
    queryFn: () => vehiclesApi.list({ status: 'available', limit: 100 }),
  });
  const vehicles: Vehicle[] = vehiclesRes?.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => driversApi.assignVehicle(driver.id, vehicleId),
    onSuccess: () => {
      toast.success('Vehicle assigned');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign');
    },
  });

  return (
    <Modal title="Assign Vehicle" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">Select a vehicle for <span className="text-white font-medium">{driver.name}</span></p>
        <Select
          label="Available Vehicles"
          value={vehicleId}
          onChange={e => setVehicleId(e.target.value)}
        >
          <option value="">Select vehicle...</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.plate_number} ({v.type})</option>
          ))}
        </Select>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-sm text-slate-400">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!vehicleId || mutation.isPending}
            className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium text-white disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function DriversPage() {
  const [modal, setModal] = useState<'create' | 'edit' | 'vehicle' | null>(null);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: res, isLoading, error } = useQuery({
    queryKey: ['drivers', search],
    queryFn: () => driversApi.list({ search, limit: 50 }),
  });

  const drivers: Driver[] = res?.data?.data ?? [];
  const isForbidden = (error as any)?.response?.status === 403;

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => driversApi.delete(id),
    onSuccess: () => {
      toast.success('Driver deactivated');
      qc.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to deactivate');
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['drivers'] });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers</h1>
          <p className="text-slate-400 text-sm mt-1">{drivers.length} registered drivers</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95"
        >
          + Add Driver
        </button>
      </div>

      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone or license..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none transition-all"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
        ) : isForbidden ? (
          <EmptyState title="Access Restricted" description="You don't have permission to manage drivers." />
        ) : drivers.length === 0 ? (
          <EmptyState title="No Drivers Found" description={search ? "Try adjusting your search" : "Get started by adding your first driver"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/30">
                  {['Name', 'Status', 'Phone', 'License', 'Vehicle', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {drivers.map(d => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                          {d.name[0]}
                        </div>
                        <span className="font-semibold text-white">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={d.status === 'active' ? 'success' : d.status === 'on_trip' ? 'warning' : 'muted'}>
                        {d.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{d.phone}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{d.license_number}</td>
                    <td className="px-6 py-4">
                      {d.vehicle ? (
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{d.vehicle.plate_number}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{d.vehicle.type}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSelected(d); setModal('edit'); }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                        </button>
                        <button
                          onClick={() => { setSelected(d); setModal('vehicle'); }}
                          className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                          title="Assign Vehicle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </button>
                        <button
                          onClick={() => { if(confirm('Deactivate driver?')) deactivateMutation.mutate(d.id); }}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                          title="Deactivate"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === 'create' && <DriverModal onClose={() => setModal(null)} onSuccess={() => { setModal(null); refresh(); }} />}
      {modal === 'edit' && selected && <DriverModal driver={selected} onClose={() => setModal(null)} onSuccess={() => { setModal(null); refresh(); }} />}
      {modal === 'vehicle' && selected && <AssignVehicleModal driver={selected} onClose={() => setModal(null)} onSuccess={() => { setModal(null); refresh(); }} />}
    </div>
  );
}
