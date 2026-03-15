// src/hooks/useRealtimeLocations.ts
/**
 * Real-time driver location hook
 *
 * Subscribes to Supabase Realtime channel for driver_locations INSERT events.
 * Merges incoming updates into a local state map keyed by driver_id,
 * keeping only the most recent location per driver.
 *
 * Designed to scale: Supabase Realtime uses WebSockets with automatic
 * reconnect, reducing polling pressure vs. client-side setInterval.
 */
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { DriverLocation } from '../types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type LocationMap = Record<string, DriverLocation>;

export function useRealtimeLocations(initialLocations: LocationMap = {}): LocationMap {
  const [locations, setLocations] = useState<LocationMap>(initialLocations);

  useEffect(() => {
    // Seed with initial data
    setLocations(initialLocations);
  }, [JSON.stringify(initialLocations)]);

  useEffect(() => {
    const channel = supabase
      .channel('driver-locations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_locations',
        },
        (payload) => {
          const newLoc = payload.new as DriverLocation;
          setLocations((prev) => ({
            ...prev,
            [newLoc.driver_id]: newLoc,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return locations;
}
