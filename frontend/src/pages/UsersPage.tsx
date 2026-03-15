// src/pages/UsersPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../services/api';
import { User, UserRole, UserStatus } from '../types';
import { useAuthStore } from '../store/authStore';
import { Spinner, Badge, Modal, Input, Select, EmptyState } from '../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function UserModal({ user, onClose, onSuccess }: { user?: User; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: (user?.role ?? 'dispatcher') as UserRole,
  });

  const mutation = useMutation({
    mutationFn: () =>
      user
        ? usersApi.update(user.id, { name: form.name, role: form.role })
        : usersApi.create(form),
    onSuccess: () => {
      toast.success(user ? 'Member updated' : 'Member added');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Operation failed');
    },
  });

  return (
    <Modal title={user ? 'Edit Member' : 'Invite Member'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
        <Input
          label="Full Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
        />
        {!user && (
          <Input
            label="Email Address"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
        )}
        <Select
          label="Organization Role"
          value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
        >
          <option value="dispatcher">Dispatcher</option>
          <option value="driver">Driver</option>
          <option value="admin">System Admin</option>
        </Select>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-sm text-slate-400">Cancel</button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium text-white shadow-lg shadow-orange-500/20"
          >
            {mutation.isPending ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  const { data: res, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.list({ search: search || undefined, limit: 100 }),
  });

  const users: User[] = res?.data?.data ?? [];

  const suspendMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      toast.success('Access revoked');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => usersApi.update(id, { role }),
    onSuccess: () => {
      toast.success('Role modified');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] });

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Access Control</h1>
          <div className="flex items-center gap-3 mt-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Organization Snapshot:</span>
            <Badge variant="info">{roleCounts.admin || 0} Admins</Badge>
            <Badge variant="warning">{roleCounts.dispatcher || 0} Dispatchers</Badge>
            <Badge variant="success">{roleCounts.driver || 0} Drivers</Badge>
          </div>
        </div>
        <button
          onClick={() => setModal('create')}
          className="bg-white hover:bg-slate-100 text-slate-900 text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-xl active:scale-95"
        >
          Add Member
        </button>
      </div>

      <div className="relative max-w-sm">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name or email..."
          className="w-full bg-slate-900/50 border border-slate-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-orange-500 focus:bg-slate-900 transition-all"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="py-24 flex justify-center"><Spinner size="lg" /></div>
        ) : users.length === 0 ? (
          <EmptyState title="No Team Members" description="Add your first organizational member to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/20">
                  {['Member Identity', 'Platform Role', 'Account Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {users.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-800/20 transition-all ${u.id === me?.id ? 'bg-orange-500/[0.02]' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-black text-white shadow-inner">
                          {u.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white flex items-center gap-2">
                            {u.name}
                            {u.id === me?.id && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 rounded-md font-black uppercase tracking-widest">Self</span>}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {me?.id === u.id ? (
                        <div className="flex"><Badge variant="info">{u.role}</Badge></div>
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => roleChangeMutation.mutate({ id: u.id, role: e.target.value as UserRole })}
                          className="bg-slate-800/50 border border-slate-700/50 text-[11px] font-bold text-slate-300 rounded-lg px-2 py-1 focus:ring-1 focus:ring-orange-500 transition-all appearance-none cursor-pointer hover:bg-slate-800"
                        >
                          <option value="admin">System Admin</option>
                          <option value="dispatcher">Dispatcher</option>
                          <option value="driver">Driver</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
                        {u.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-500">
                      {format(new Date(u.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <button onClick={() => { setSelected(u); setModal('edit'); }} className="text-[11px] font-black text-slate-500 hover:text-white uppercase tracking-tighter transition-colors">Edit</button>
                         {u.id !== me?.id && u.status !== 'suspended' && (
                           <button 
                             onClick={() => { if(confirm(`Revoke access for ${u.name}?`)) suspendMutation.mutate(u.id); }}
                             className="text-[11px] font-black text-red-500/60 hover:text-red-400 uppercase tracking-tighter transition-colors"
                           >Suspend</button>
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

      {modal === 'create' && <UserModal onClose={() => setModal(null)} onSuccess={() => { setModal(null); refresh(); }} />}
      {modal === 'edit' && selected && <UserModal user={selected} onClose={() => setModal(null)} onSuccess={() => { setModal(null); refresh(); }} />}
    </div>
  );
}
