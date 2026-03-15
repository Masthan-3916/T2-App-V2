// src/pages/TrackingPage.tsx
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { driversApi } from '../services/api';
import { Driver, DriverLocation } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix for default leaflet icons in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981', // emerald-500
  on_trip: '#f97316', // orange-500
  inactive: '#64748b', // slate-500
};

function createCustomIcon(status: string) {
  const color = STATUS_COLORS[status] || '#64748b';
  return L.divIcon({
    html: `
      <div class="relative">
        <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg" style="background-color: ${color}"></div>
        ${status === 'on_trip' ? '<div class="absolute inset-0 w-4 h-4 rounded-full border-2 border-white animate-ping" style="background-color: ' + color + '; opacity: 0.5"></div>' : ''}
      </div>
    `,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// Component to handle map centering
function MapAutoCenter({ locations }: { locations: DriverLocation[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(l => [l.latitude, l.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [locations.length === 0]); // only center on initial load

  return null;
}

export default function TrackingPage() {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const { data: driversRes } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: () => driversApi.list({ limit: 100 }),
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['all-locations'],
    queryFn: () => driversApi.listAllLocations(),
    refetchInterval: 10_000,
  });

  const drivers: Driver[] = driversRes?.data?.data ?? [];
  const locations: DriverLocation[] = locationsRes?.data?.data ?? [];

  // Map locations to drivers
  const driverMap = new Map(drivers.map(d => [d.id, d]));
  const trackedDrivers = locations.map(loc => ({
    ...loc,
    driver: driverMap.get(loc.driver_id),
  })).filter(td => td.driver);

  const selectedLocation = trackedDrivers.find(td => td.driver_id === selectedDriverId);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-5">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Tracking</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {trackedDrivers.length} active drivers on map · Auto-updates every 10s
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Active</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-slate-400">On Trip</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Fleet Members</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {drivers.length === 0 ? (
              <div className="p-4 text-center text-slate-600 text-sm">No drivers registered</div>
            ) : (
              drivers.map(d => {
                const hasLoc = locations.some(l => l.driver_id === d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDriverId(d.id === selectedDriverId ? null : d.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      selectedDriverId === d.id
                        ? 'bg-orange-500/10 ring-1 ring-orange-500/50'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 bg-slate-500 ${
                        d.status === 'active' ? 'bg-emerald-500' : 
                        d.status === 'on_trip' ? 'bg-orange-500 animate-pulse' : ''
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{d.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                          {d.status.replace('_', ' ')} {hasLoc ? '· LIVE' : ''}
                        </p>
                      </div>
                      {hasLoc && <span className="text-emerald-400 text-xs text-shadow-glow">📍</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl">
          <MapContainer
            center={[37.7749, -122.4194]}
            zoom={12}
            style={{ height: '100%', width: '100%', background: '#0f172a' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {trackedDrivers.map((td) => (
              <Marker
                key={td.id}
                position={[td.latitude, td.longitude]}
                icon={createCustomIcon(td.driver!.status)}
                eventHandlers={{
                  click: () => setSelectedDriverId(td.driver_id),
                }}
              >
                <Popup>
                  <div className="text-slate-900 p-1">
                    <p className="font-bold border-b mb-1">{td.driver!.name}</p>
                    <p className="text-xs">Status: <span className="capitalize">{td.driver!.status.replace('_', ' ')}</span></p>
                    <p className="text-xs">Last updated: {new Date(td.timestamp).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
            <MapAutoCenter locations={locations} />
          </MapContainer>

          {/* Map Overlay Info */}
          {selectedLocation && (
            <div className="absolute bottom-6 right-6 z-[1000] w-64 bg-slate-900/90 backdrop-blur-md border border-orange-500/30 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold">
                  {selectedLocation.driver!.name[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedLocation.driver!.name}</h3>
                  <p className="text-[10px] text-slate-400">{selectedLocation.driver!.phone}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Status</span>
                  <span className={`font-bold capitalize ${
                    selectedLocation.driver!.status === 'on_trip' ? 'text-orange-400' : 'text-emerald-400'
                  }`}>
                    {selectedLocation.driver!.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Coordinates</span>
                  <span className="text-white font-mono">
                    {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDriverId(null)}
                className="mt-4 w-full py-1.5 text-[10px] font-bold text-slate-500 hover:text-white transition-colors"
              >
                Close Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
