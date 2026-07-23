'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { useEvents } from '@/lib/useEvents';

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
  { name: 'Victoria Falls', lat: -17.9333, lng: 25.8333 }
];

export default function MapPage() {
  const { events } = useEvents();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userCity, setUserCity] = useState<string>('Enable location access');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedCityName, setSelectedCityName] = useState<string>('My Location');
  const [selectedCenter, setSelectedCenter] = useState<[number, number]>(DEFAULT_CENTER);

  useEffect(() => {
    const cached = localStorage.getItem('user_location_cache');
    if (cached) {
      try {
        const [lat, lng] = JSON.parse(cached);
        setUserLocation([lat, lng]);
        setSelectedCenter([lat, lng]);
        setSelectedCityName('My Location');
      } catch (e) {}
    } else {
      // Auto-prompt on first load
      requestLocation();
    }
  }, []);

  const requestLocation = () => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation not supported');
      setUserCity('Location unavailable');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        setSelectedCenter([latitude, longitude]);
        setSelectedCityName('My Location');
        const city = detectCity(latitude, longitude);
        setUserCity(`${city}, Zimbabwe`);
        setIsLocating(false);
        localStorage.setItem('user_location_cache', JSON.stringify([latitude, longitude]));
      },
      (error) => {
        setIsLocating(false);
        if (error.code === 1) {
          setLocationError('Location permission denied - check browser settings');
        } else if (error.code === 2) {
          setLocationError('Location unavailable');
        } else if (error.code === 3) {
          setLocationError('Location request timed out');
        } else {
          setLocationError('Could not get location');
        }
        setUserCity('Location unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const mapCenter = userLocation || DEFAULT_CENTER;

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>
      {/* Full Screen Map Section */}
      <div className="relative w-full h-screen">
        {/* City Navigation Header */}
        <div className="fixed top-[calc(var(--nav-h)+12px)] inset-x-0 z-[1000] pointer-events-none">
          <div 
            className="flex gap-2 overflow-x-auto px-4 sm:px-6 pb-2 pointer-events-auto cursor-grab active:cursor-grabbing after:content-[''] after:w-4 after:shrink-0 items-center justify-start"
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
              className={`shrink-0 px-8 py-3 rounded-full text-lg font-bold whitespace-nowrap transition-all flex items-center gap-2
                ${selectedCityName === 'My Location'
                  ? 'bg-[#3B5BFF] text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-900 bg-transparent'
                }`}
            >
              <Navigation size={20} className={selectedCityName === 'My Location' ? 'text-white' : 'text-gray-400'} />
              {isLocating ? 'Locating...' : 'My Location'}
            </button>
            
            {CITIES.map(city => (
              <button
                key={city.name}
                onClick={() => {
                  setSelectedCityName(city.name);
                  setSelectedCenter([city.lat, city.lng]);
                }}
                className={`shrink-0 px-8 py-3 rounded-full text-lg font-bold whitespace-nowrap transition-all
                  ${selectedCityName === city.name 
                    ? 'bg-[#3B5BFF] text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-900 bg-transparent'
                  }`}
              >
                {city.name}
              </button>
            ))}
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
