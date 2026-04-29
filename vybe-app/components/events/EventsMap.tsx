'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { Event } from '@/types';

const DEFAULT_CENTER: [number, number] = [-19.0154, 29.1549]; // Zimbabwe (approx)
const DEFAULT_ZOOM = 6;
const USER_ZOOM = 12;

// Fix default marker icons in Next.js bundlers.
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -36],
  shadowSize: [41, 41],
});

export default function EventsMap({ events }: { events: Event[] }) {
  const points = useMemo(
    () => events.filter(e => typeof e.lat === 'number' && typeof e.lng === 'number'),
    [events]
  );
  const mapRef = useRef<LeafletMap | null>(null);
  const [locLabel, setLocLabel] = useState('Zimbabwe');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], USER_ZOOM, { animate: true });
        setLocLabel('Your area');
      },
      () => {
        // Keep Zimbabwe overview.
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 }
    );
  }, []);

  return (
    <div className="card rounded-3xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="type-overline text-[var(--text-muted)]">Map</p>
          <p className="text-sm font-semibold text-[var(--text)]">Events across Zimbabwe</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] shrink-0">
          <MapPin size={14} />
          {locLabel}
        </div>
      </div>

      <div className="h-[320px] sm:h-[380px]">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          ref={(m: LeafletMap | null) => {
            mapRef.current = m;
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {points.map(ev => (
            <Marker key={ev.id} position={[ev.lat!, ev.lng!]} icon={markerIcon}>
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
                    {ev.venue} · {ev.date}
                  </div>
                  <Link href={`/events/${ev.id}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                    View event
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

