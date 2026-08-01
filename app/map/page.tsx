'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Navigation } from 'lucide-react';
import { useEvents } from '@/lib/useEvents';
import { isValidCoordinates } from '@/lib/geography';

const EventsMap = dynamic(() => import('@/components/events/EventsMap'), { ssr: false });

const DEFAULT_CENTER: [number, number] = [-19.0154, 29.1549]; // Zimbabwe center

// City detection based on coordinates (simplified reverse geocoding for Zimbabwe)
const detectCity = (lat: number, lng: number): string => {
  // Harare region
  if (lat >= -17.9 && lat <= -17.7 && lng >= 30.9 && lng <= 31.2) return 'Harare';
  // Bulawayo region
  if (lat >= -20.3 && lat <= -20.1 && lng >= 28.4 && lng <= 28.7) return 'Bulawayo';
  // Mutare region
  if (lat >= -19.0 && lat <= -18.8 && lng >= 32.5 && lng <= 32.8) return 'Mutare';
  // Gweru region
  if (lat >= -19.5 && lat <= -19.3 && lng >= 29.7 && lng <= 30.0) return 'Gweru';
  // Masvingo region
  if (lat >= -20.1 && lat <= -19.9 && lng >= 30.7 && lng <= 31.0) return 'Masvingo';
  // Kadoma region
  if (lat >= -18.4 && lat <= -18.2 && lng >= 29.0 && lng <= 29.3) return 'Kadoma';
  // Bindura region
  if (lat >= -17.4 && lat <= -17.2 && lng >= 31.2 && lng <= 31.5) return 'Bindura';
  // Shamva region
  if (lat >= -17.4 && lat <= -17.2 && lng >= 31.4 && lng <= 31.7) return 'Shamva';
  // Marondera region
  if (lat >= -18.2 && lat <= -18.0 && lng >= 31.4 && lng <= 31.7) return 'Marondera';
  // Chinhoyi region
  if (lat >= -17.4 && lat <= -17.2 && lng >= 30.0 && lng <= 30.3) return 'Chinhoyi';
  
  return 'Your Area';
};

const CITIES = [
  { name: 'Harare', lat: -17.8216, lng: 31.0492 },
  { name: 'Bulawayo', lat: -20.1500, lng: 28.5833 },
  { name: 'Mutare', lat: -18.9728, lng: 32.6693 },
  { name: 'Gweru', lat: -19.4500, lng: 29.8167 },
  { name: 'Shamva', lat: -17.3116, lng: 31.5756 },
  { name: 'Bindura', lat: -17.3019, lng: 31.3306 },
  { name: 'Victoria Falls', lat: -17.9333, lng: 25.8333 }
];

type LocationStatus = 'idle' | 'locating' | 'located' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export default function MapPage() {
  const { events } = useEvents();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userCity, setUserCity] = useState<string>('Enable location to calculate distance.');
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [selectedCityName, setSelectedCityName] = useState<string>('Zimbabwe');
  const [selectedCenter, setSelectedCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const isLocating = locationStatus === 'locating';

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported');
      setUserCity('Location is not supported by this browser.');
      return;
    }

    if (isLocating) return;
    setLocationStatus('locating');

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        if (!isValidCoordinates(latitude, longitude)) {
          setLocationStatus('unavailable');
          setUserCity('Your browser returned an invalid location. Please try again.');
          return;
        }
        setUserLocation([latitude, longitude]);
        setLocationAccuracy(Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null);
        setSelectedCenter([latitude, longitude]);
        setSelectedCityName('My Location');
        const city = detectCity(latitude, longitude);
        setUserCity(`${city}, Zimbabwe`);
        setLocationStatus('located');
      },
      (error) => {
        if (error.code === 1) {
          setLocationStatus('denied');
          setUserCity('Location permission was denied. Enable it in browser settings to calculate distance.');
        } else if (error.code === 2) {
          setLocationStatus('unavailable');
          setUserCity('Your location is currently unavailable. Please try again.');
        } else if (error.code === 3) {
          setLocationStatus('timeout');
          setUserCity('Location took too long. Please try again.');
        } else {
          setLocationStatus('unavailable');
          setUserCity('We could not determine your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [isLocating]);

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>
      {/* Full Screen Map Section */}
      <div className="relative w-full h-screen">
        {/* City Navigation Header */}
        <div className="fixed top-[calc(var(--nav-h)+12px)] inset-x-0 z-[1000] pointer-events-none">
          <div className="mx-3 sm:mx-auto sm:max-w-5xl rounded-[var(--r-2xl)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] p-2 pointer-events-auto">
          <div 
            className="flex gap-2 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing items-center justify-start"
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
              const walk = (x - startX) * 2;
              slider.scrollLeft = scrollLeft - walk;
            }}
          >
            {/* My Location Pill */}
            <button
              onClick={() => {
                if (userLocation) {
                  setSelectedCityName('My Location');
                  setSelectedCenter(userLocation);
                } else {
                  requestLocation();
                }
              }}
              disabled={isLocating}
              aria-pressed={selectedCityName === 'My Location'}
              className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 disabled:opacity-60
                ${selectedCityName === 'My Location'
                  ? 'btn-grad text-white shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-secondary)]'
                }`}
            >
              <Navigation size={16} />
              {isLocating ? 'Locating...' : 'My Location'}
            </button>
            
            {CITIES.map(city => (
              <button
                key={city.name}
                onClick={() => {
                  setSelectedCityName(city.name);
                  setSelectedCenter([city.lat, city.lng]);
                }}
                aria-pressed={selectedCityName === city.name}
                className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                  ${selectedCityName === city.name 
                    ? 'btn-grad text-white shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--bg-secondary)]'
                  }`}
              >
                {city.name}
              </button>
            ))}
          </div>
          {locationStatus !== 'idle' && (
            <p className="px-2 pt-1 text-xs text-[var(--text-muted)]" role="status">
              {isLocating
                ? 'Requesting your current location…'
                : `${userCity}${locationStatus === 'located' && locationAccuracy != null ? ` · accurate to about ${Math.round(locationAccuracy)} m` : ''}`}
            </p>
          )}
          </div>
        </div>

        <EventsMap 
          events={events}
          title=""
          subtitle=""
          defaultCenter={selectedCenter}
          defaultZoom={10}
          heightClass="h-full"
          userLocation={userLocation}
        />
        

      </div>
    </div>
  );
}
