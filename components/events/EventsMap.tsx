'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvent } from 'react-leaflet';
import type { MapRef } from 'react-leaflet/MapContainer';
import L from 'leaflet';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { haversineKm } from '@/lib/geography';
import type { Event } from '@/types';

type LeafletMap = NonNullable<MapRef>;
type LeafletBounds = ReturnType<LeafletMap['getBounds']>;

const DEFAULT_CENTER: [number, number] = [-19.0154, 29.1549];
const DEFAULT_ZOOM = 11; // Zoomed out for ~30km radius
const MARKER_BASE_SIZE = 48;
const MARKER_ZOOMED_SIZE = 56;

interface EventsMapProps {
  events: Event[];
  title?: string;
  subtitle?: string;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  heightClass?: string;
  userLocation?: [number, number] | null;
}

// Calculate distance between two coordinates
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const d = haversineKm(lat1, lon1, lat2, lon2);
  if (d < 1) return Math.round(d * 1000) + ' m';
  return d.toFixed(1) + ' km';
};

// Create clean teardrop marker icon
const createEventMarker = (event: Event, zoom: number) => {
  const size = zoom >= 13 ? MARKER_ZOOMED_SIZE : MARKER_BASE_SIZE;
  
  return L.divIcon({
    className: 'event-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        background: white;
        transform: rotate(-45deg);
        box-shadow: -3px 3px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        position: relative;
        cursor: pointer;
      ">
        <div style="
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          transform: rotate(45deg);
        ">
          <img src="${event.image}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size], // anchor at the bottom point
    popupAnchor: [0, -size],
  });
};

// User location marker with pulse
const createUserMarker = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
      ">
        <div style="
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: rgba(59,156,255,0.3);
          animation: pulse 2s infinite;
        "></div>
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #3B9CFF;
          border: 3px solid white;
          box-shadow: 0 2px 12px rgba(59,156,255,0.6);
          position: relative;
          z-index: 1;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 0; }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Zoom level detector component
function MapEventsDetector({
  onZoomChange,
  onBoundsChange,
}: {
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: LeafletBounds) => void;
}) {
  const map = useMap();

  useMapEvent('zoomend', () => {
    onZoomChange(map.getZoom());
    onBoundsChange(map.getBounds());
  });
  useMapEvent('moveend', () => {
    onBoundsChange(map.getBounds());
  });
  useEffect(() => {
    if (map) {
      onBoundsChange(map.getBounds());
    }
  }, [map, onBoundsChange]);
  return null;
}

export default function EventsMap({ 
  events,
  title = "Map",
  subtitle = "Events across Zimbabwe",
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
  heightClass = "h-[320px] sm:h-[380px]",
  userLocation: propUserLocation
}: EventsMapProps) {
  const router = useRouter();
  const points = useMemo(
    () => events.filter(e => 
      e.lat != null && 
      e.lng != null && 
      !isNaN(e.lat) && 
      !isNaN(e.lng) &&
      e.lat !== 0 &&
      e.lng !== 0
    ),
    [events]
  );
  const mapRef = useRef<LeafletMap | null>(null);
  const [zoom, setZoom] = useState(defaultZoom);
  const userLocation = propUserLocation ?? null;
  const [initialCenter] = useState<[number, number]>(
    () => propUserLocation ?? defaultCenter,
  );
  const [visibleEvents, setVisibleEvents] = useState<Event[]>([]);

  // Handle defaultCenter changes (e.g. clicking a city pill)
  useEffect(() => {
    if (mapRef.current && defaultCenter) {
      mapRef.current.setView(defaultCenter, defaultZoom, { animate: true, duration: 1.5 });
    }
  }, [defaultCenter, defaultZoom]);

  // Handle defaultZoom prop changes
  useEffect(() => {
    if (mapRef.current && !propUserLocation) {
      mapRef.current.setZoom(defaultZoom);
    }
  }, [defaultZoom, propUserLocation]);

  const handleBoundsChange = useCallback((bounds: LeafletBounds) => {
    setVisibleEvents((prev) => {
      const visible = points.filter(ev => bounds.contains([ev.lat!, ev.lng!]));
      if (prev.length !== visible.length) return visible;
      const prevIds = prev.map(p => p.id).join(',');
      const newIds = visible.map(v => v.id).join(',');
      if (prevIds !== newIds) return visible;
      return prev;
    });
  }, [points]);

  const handleMarkerClick = (eventId: string) => {
    // Scroll to the card or navigate
    const card = document.getElementById(`event-card-${eventId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  return (
    <div className={`relative overflow-hidden ${title || subtitle ? 'card rounded-3xl' : 'h-full w-full'}`}>
      <div className={heightClass}>
        <MapContainer
          center={initialCenter}
          zoom={defaultZoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEventsDetector onZoomChange={setZoom} onBoundsChange={handleBoundsChange} />

          {/* User location marker */}
          {userLocation && (
            <Marker 
              position={userLocation}
              icon={createUserMarker()}
              interactive={false}
            />
          )}

          {/* Event markers */}
          {points.map(ev => (
            <div key={ev.id}>
              {/* Main marker - Teardrop */}
              <Marker 
                position={[ev.lat!, ev.lng!]} 
                icon={createEventMarker(ev, zoom)}
                eventHandlers={{
                  click: () => handleMarkerClick(ev.id)
                }}
              />
            </div>
          ))}
        </MapContainer>
      </div>

      {/* ── Bottom Event Cards Overlay ── */}
      {visibleEvents.length > 0 && (
        <div className="absolute bottom-12 inset-x-0 z-[1000] flex flex-col pointer-events-none">
          <div className="px-4 sm:px-6 mb-2 flex items-center gap-1 pointer-events-auto w-fit">
            <span className="font-bold text-[#1a1a2e] bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-sm shadow-sm flex items-center gap-1">
              Places near by <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </span>
          </div>
          
          <div 
            className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-4 pt-2 pointer-events-auto cursor-grab active:cursor-grabbing after:content-[''] after:w-4 after:shrink-0"
            onMouseDown={(e) => {
              const slider = e.currentTarget;
              slider.dataset.isDown = 'true';
              slider.dataset.startX = (e.pageX - slider.offsetLeft).toString();
              slider.dataset.scrollLeft = slider.scrollLeft.toString();
            }}
            onMouseLeave={(e) => {
              e.currentTarget.dataset.isDown = 'false';
            }}
            onMouseUp={(e) => {
              e.currentTarget.dataset.isDown = 'false';
            }}
            onMouseMove={(e) => {
              const slider = e.currentTarget;
              if (slider.dataset.isDown !== 'true') return;
              e.preventDefault();
              const startX = parseFloat(slider.dataset.startX || '0');
              const scrollLeft = parseFloat(slider.dataset.scrollLeft || '0');
              const x = e.pageX - slider.offsetLeft;
              const walk = (x - startX) * 2; // Scroll-fast
              slider.scrollLeft = scrollLeft - walk;
            }}
          >
            {visibleEvents.map(ev => {
              const distance = userLocation ? getDistance(userLocation[0], userLocation[1], ev.lat!, ev.lng!) : '';
              const isFree = ev.price === 0;

              return (
                <div 
                  key={ev.id}
                  id={`event-card-${ev.id}`}
                  onClick={() => router.push(`/events/${ev.id}`)}
                  className="bg-[var(--bg-card)] rounded-[20px] border border-[var(--border)] shadow-[var(--shadow)] w-[140px] shrink-0 cursor-pointer transition-transform hover:-translate-y-1 group overflow-hidden flex flex-col"
                >
                  {/* Image section */}
                  <div className="w-full h-[160px] relative overflow-hidden shrink-0">
                    <img src={ev.image} alt={ev.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Bottom Left: Price */}
                    <div className="absolute bottom-2 left-2.5 flex flex-col items-start gap-0">
                      <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                        {isFree ? '' : 'Starting from'}
                      </span>
                      <span className="text-xs font-black text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                        {isFree ? 'Free' : ev.priceLabel}
                      </span>
                    </div>
                  </div>

                  {/* Body section */}
                  <div className="p-3 flex flex-col flex-1 bg-[var(--bg-card)]">
                    <h3 className="font-extrabold text-[var(--text)] text-xs line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
                      {ev.title}
                    </h3>

                    {distance && (
                      <span className="text-[10px] font-bold text-[var(--text-muted)] mt-auto pt-1 flex items-center gap-1">
                        <MapPin size={10} /> {distance}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

