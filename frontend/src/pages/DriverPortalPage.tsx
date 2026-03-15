// src/pages/DriverPortalPage.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, driversApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Order, OrderStatus, Driver } from '../types';
import { Badge } from '../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DriverPortalPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [isTracking, setIsTracking] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [driverProfile, setDriverProfile] = useState<Driver | null>(null);

  // Find driver profile linked to this user
  useEffect(() => {
    if (!user) return;
    driversApi.list({ limit: 100 }).then(res => {
      const drivers: Driver[] = res.data?.data ?? [];
      const mine = drivers.find(d => d.user_id === user.id);
      if (mine) setDriverProfile(mine);
    });
  }, [user]);

  const { data: ordersRes } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.list({ limit: 20 }),
    refetchInterval: 15_000,
    enabled: !!driverProfile,
  });

  const orders: Order[] = ordersRes?.data?.data ?? [];
  const activeOrder = orders.find(o => ['assigned', 'in_transit'].includes(o.status));

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Logistics state updated');
      qc.invalidateQueries({ queryKey: ['my-orders'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Update failed');
    },
  });

  // Location tracking
  const startTracking = () => {
    if (!navigator.geolocation || !driverProfile) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        driversApi.updateLocation(
          driverProfile.id,
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy
        ).catch(console.error);
      },
      (err) => { 
        console.error('Geolocation error:', err);
        toast.error('Location access denied');
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 5000 }
    );
    setLocationWatchId(watchId);
    setIsTracking(true);
    toast.success('Live transmitter active');
  };

  const stopTracking = () => {
    if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
    }
    setIsTracking(false);
    toast.success('Transmitter offline');
  };

  useEffect(() => {
    return () => {
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
    };
  }, [locationWatchId]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Driver Identity */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-0.5 shadow-lg shadow-orange-500/20">
              <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-xl">
                 🚚
              </div>
           </div>
           <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{user?.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                 <Badge variant={driverProfile ? 'success' : 'danger'}>
                    {driverProfile ? 'Verified Driver' : 'Profile Missing'}
                 </Badge>
                 {driverProfile?.license_number && <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">{driverProfile.license_number}</span>}
              </div>
           </div>
        </div>
      </div>

      {/* Live Operations Control */}
      <div className="relative group overflow-hidden">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
        <div className="relative bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-white uppercase tracking-widest">Grid Status</h2>
                {isTracking && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Online</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                Real-time positioning enables the logistics engine to optimize your routes and notify dispatchers of your progress.
              </p>
            </div>

            <button
              onClick={isTracking ? stopTracking : startTracking}
              disabled={!driverProfile}
              className={`relative px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 transform active:scale-95 shadow-2xl ${
                isTracking
                  ? 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20'
              } disabled:opacity-30 disabled:grayscale`}
            >
              {isTracking ? 'Go Offline' : 'Go Online'}
            </button>
          </div>

          {isTracking && (
            <div className="mt-8 pt-6 border-t border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Active broadcast in progress...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Assignment */}
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Active Assignment</h2>
      {activeOrder ? (
        <div className="bg-slate-900 border border-orange-500/30 rounded-[2rem] p-8 shadow-2xl space-y-8">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Manifest ID</p>
               <h3 className="text-white font-mono font-bold">#{activeOrder.id.slice(0, 8)}</h3>
            </div>
            <Badge variant="warning">{activeOrder.status.replace('_', ' ').toUpperCase()}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Visual connector */}
            <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-px bg-slate-800" />
            
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" /> Pickup
              </p>
              <p className="text-white font-medium text-sm leading-relaxed">{activeOrder.pickup_location}</p>
            </div>
            
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Destination
              </p>
              <p className="text-white font-medium text-sm leading-relaxed">{activeOrder.drop_location}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/50 flex flex-col sm:flex-row gap-4">
            {activeOrder.status === 'assigned' && (
              <button
                onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'in_transit' })}
                disabled={updateStatusMutation.isPending}
                className="flex-1 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95"
              >
                Start Delivery Transaction
              </button>
            )}
            {activeOrder.status === 'in_transit' && (
              <button
                onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'completed' })}
                disabled={updateStatusMutation.isPending}
                className="flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
              >
                Confirm Secure Delivery
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-12 text-center shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6 text-2xl grayscale opacity-50">
            📦
          </div>
          <h3 className="text-white font-bold mb-1">Queue Empty</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">Stand by for upcoming assignments from the dispatch center.</p>
        </div>
      )}

      {/* History */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="px-8 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/10">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operation Log</h2>
          <span className="text-[10px] text-slate-600 font-mono">LATEST 10</span>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-xs font-bold uppercase tracking-widest italic">No history recorded</div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {orders.slice(0, 10).map(o => (
              <div key={o.id} className="px-8 py-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-medium text-white truncate">{o.pickup_location} → {o.drop_location}</p>
                  <p className="text-[10px] text-slate-600 font-bold mt-0.5">{format(new Date(o.created_at), 'MMM d, h:mm a')}</p>
                </div>
                <div className="scale-75 origin-right">
                   <Badge variant={o.status === 'completed' ? 'success' : o.status === 'cancelled' ? 'danger' : 'info'}>
                     {o.status.toUpperCase()}
                   </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
