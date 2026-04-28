import { useState, useRef, useEffect } from 'react';
import { MapPin, X, AlertCircle } from 'lucide-react';

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  road?: string;
  address?: string;
}

interface MapLocationPickerProps {
  onSelectLocation: (data: LocationData) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function MapLocationPicker({ onSelectLocation, isOpen, onClose }: MapLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [reverseGeoResult, setReverseGeoResult] = useState<{ city: string; road: string; address: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState<string>('23.8103');
  const [manualLng, setManualLng] = useState<string>('90.4125');
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    setMapLoaded(false);
    setReverseGeoResult(null);
    loadGoogleMaps();
  }, [isOpen]);

  const loadGoogleMaps = () => {
    console.log('Starting Google Maps load...');
    
    // Check if already loaded
    if ((window as any).google?.maps) {
      console.log('Google Maps already loaded');
      initializeMap();
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAj0KRGsaineqbhl3F8VytjS73bE0p6pNM&libraries=places,marker';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('Google Maps script loaded');
      setTimeout(() => initializeMap(), 500);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setError('Unable to load Google Maps. Using manual coordinate input instead.');
      setLoading(false);
      setMapLoaded(false);
    };

    document.head.appendChild(script);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      
      if (data && data.address) {
        const addr = data.address;
        const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
        const road = addr.road || addr.suburb || addr.neighbourhood || '';
        const fullAddress = data.display_name || '';

        setReverseGeoResult({ city, road, address: fullAddress });
        console.log('Reverse geocoded via Nominatim:', { city, road, address: fullAddress });
      } else {
        console.warn('Geocode failed, no address block found');
        setReverseGeoResult(null);
      }
    } catch (err) {
      console.error('Geocoding fetch error:', err);
      setReverseGeoResult(null);
    } finally {
      setGeocoding(false);
    }
  };

  const initializeMap = () => {
    try {
      if (!mapContainerRef.current) {
        throw new Error('Map container not found');
      }

      if (!(window as any).google?.maps) {
        throw new Error('Google Maps API not available');
      }

      console.log('Initializing map...');

      const defaultCenter = { lat: 23.8103, lng: 90.4125 }; // Dhaka

      const map = new (window as any).google.maps.Map(mapContainerRef.current, {
        zoom: 14,
        center: defaultCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#666666' }],
          },
        ],
      });

      mapRef.current = map;

      // Create draggable marker
      const marker = new (window as any).google.maps.Marker({
        position: defaultCenter,
        map: map,
        draggable: true,
        title: 'Drag to set location',
        animation: (window as any).google.maps.Animation.DROP,
      });

      markerRef.current = marker;
      setSelectedCoords({ latitude: defaultCenter.lat, longitude: defaultCenter.lng });

      // Initial reverse geocode
      reverseGeocode(defaultCenter.lat, defaultCenter.lng);

      // Update on marker drag
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        const newCoords = { latitude: pos.lat(), longitude: pos.lng() };
        setSelectedCoords(newCoords);
        reverseGeocode(pos.lat(), pos.lng());
        console.log('Marker moved to:', newCoords);
      });

      // Update on map click
      map.addListener('click', (event: any) => {
        const newCoords = { latitude: event.latLng.lat(), longitude: event.latLng.lng() };
        setSelectedCoords(newCoords);
        marker.setPosition(event.latLng);
        reverseGeocode(event.latLng.lat(), event.latLng.lng());
        console.log('Map clicked, location set to:', newCoords);
      });

      setLoading(false);
      setMapLoaded(true);
      setError(null);
      console.log('Map initialized successfully');
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map. Please use manual coordinate input.');
      setLoading(false);
      setMapLoaded(false);
    }
  };

  const handleSetCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid numbers for latitude and longitude');
      return;
    }

    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180');
      return;
    }

    const newCoords = { latitude: lat, longitude: lng };
    setSelectedCoords(newCoords);
    setError(null);

    // Also reverse geocode manual coordinates
    reverseGeocode(lat, lng);

    // Move map and marker if available
    if (mapRef.current && markerRef.current) {
      const pos = { lat, lng };
      mapRef.current.setCenter(pos);
      markerRef.current.setPosition(pos);
    }
  };

  const handleConfirm = () => {
    if (selectedCoords) {
      onSelectLocation({
        ...selectedCoords,
        city: reverseGeoResult?.city,
        road: reverseGeoResult?.road,
        address: reverseGeoResult?.address,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-main">Set Store Location</h2>
              <p className="text-xs text-muted mt-1">Click on map or drag marker to select location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Map Container - Left/Top */}
          <div className="flex-1 relative bg-slate-100 overflow-hidden min-h-[400px]">
            {loading && !mapLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20">
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm font-semibold text-main">Loading Google Maps...</p>
                  <p className="text-xs text-muted">This may take a moment</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute top-4 left-4 right-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 z-10 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">{error}</p>
                </div>
              </div>
            )}

            {mapLoaded && (
              <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg p-3 z-10 max-w-xs">
                <p className="text-xs font-semibold text-main mb-1">📍 How to use:</p>
                <ul className="text-xs text-muted space-y-1">
                  <li>✓ <strong>Click</strong> anywhere on map to place marker</li>
                  <li>✓ <strong>Drag</strong> marker to adjust location</li>
                  <li>✓ Address fields auto-fill from location</li>
                </ul>
              </div>
            )}

            {selectedCoords && mapLoaded && (
              <div className="absolute bottom-4 right-4 bg-green-50 border-2 border-green-300 rounded-xl p-4 z-10 shadow-lg">
                <p className="text-xs font-bold text-green-800 uppercase mb-2">Selected Location</p>
                <div className="space-y-1">
                  <p className="font-mono text-sm text-green-900">
                    <span className="font-bold">Lat:</span> {selectedCoords.latitude.toFixed(6)}
                  </p>
                  <p className="font-mono text-sm text-green-900">
                    <span className="font-bold">Lng:</span> {selectedCoords.longitude.toFixed(6)}
                  </p>
                </div>
                {geocoding && (
                  <p className="text-xs text-green-600 mt-2 animate-pulse">Looking up address...</p>
                )}
              </div>
            )}

            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          {/* Sidebar - Right/Bottom */}
          <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto flex flex-col">
            {/* Selected Coords Display */}
            {selectedCoords && (
              <div className="p-6 border-b border-slate-200 bg-gradient-to-br from-green-50 to-emerald-50">
                <p className="text-xs font-bold text-green-800 uppercase tracking-widest mb-3">✓ Location Selected</p>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 border-2 border-green-200">
                    <p className="text-xs text-green-700 font-bold uppercase mb-1">Latitude</p>
                    <p className="font-mono text-lg font-bold text-green-900">{selectedCoords.latitude.toFixed(6)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-green-200">
                    <p className="text-xs text-green-700 font-bold uppercase mb-1">Longitude</p>
                    <p className="font-mono text-lg font-bold text-green-900">{selectedCoords.longitude.toFixed(6)}</p>
                  </div>
                </div>
                {/* Reverse Geocoded Address Preview */}
                {reverseGeoResult && (
                  <div className="mt-3 bg-white rounded-lg p-3 border-2 border-emerald-200">
                    <p className="text-xs text-emerald-700 font-bold uppercase mb-2">📍 Detected Address</p>
                    {reverseGeoResult.city && (
                      <p className="text-xs text-emerald-900"><span className="font-bold">City:</span> {reverseGeoResult.city}</p>
                    )}
                    {reverseGeoResult.road && (
                      <p className="text-xs text-emerald-900 mt-1"><span className="font-bold">Road:</span> {reverseGeoResult.road}</p>
                    )}
                    {reverseGeoResult.address && (
                      <p className="text-xs text-emerald-900 mt-1 line-clamp-2"><span className="font-bold">Address:</span> {reverseGeoResult.address}</p>
                    )}
                  </div>
                )}
                {geocoding && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-emerald-600 font-semibold">Looking up address...</p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Input Section */}
            <div className="p-6 border-b border-slate-200 space-y-4">
              <h3 className="font-bold text-main text-sm">Enter Coordinates Manually</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    value={manualLat}
                    onChange={(e) => {
                      setManualLat(e.target.value);
                      setError(null);
                    }}
                    placeholder="23.8103"
                    step="0.0001"
                    min="-90"
                    max="90"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono text-sm font-semibold"
                  />
                  <p className="text-xs text-muted mt-1.5 pl-1">Range: -90 to 90</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 pl-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    value={manualLng}
                    onChange={(e) => {
                      setManualLng(e.target.value);
                      setError(null);
                    }}
                    placeholder="90.4125"
                    step="0.0001"
                    min="-180"
                    max="180"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono text-sm font-semibold"
                  />
                  <p className="text-xs text-muted mt-1.5 pl-1">Range: -180 to 180</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSetCoordinates}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-main font-bold rounded-xl transition-all active:neomorph-inset"
              >
                Apply Manual Coordinates
              </button>
            </div>

            {/* Quick Locations */}
            <div className="p-6 border-b border-slate-200 space-y-3">
              <h3 className="font-bold text-main text-sm">📍 Quick Locations</h3>
              <div className="space-y-2">
                {[
                  { name: 'Dhaka Center', lat: 23.8103, lng: 90.4125 },
                  { name: 'Chittagong', lat: 22.3569, lng: 91.7832 },
                  { name: 'Sylhet', lat: 24.8949, lng: 91.8687 },
                ].map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => {
                      setManualLat(loc.lat.toString());
                      setManualLng(loc.lng.toString());
                      const coords = { latitude: loc.lat, longitude: loc.lng };
                      setSelectedCoords(coords);
                      reverseGeocode(loc.lat, loc.lng);
                      if (mapRef.current && markerRef.current) {
                        mapRef.current.setCenter(coords);
                        markerRef.current.setPosition(coords);
                      }
                      setError(null);
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all active:bg-primary/10"
                  >
                    <p className="text-xs font-bold text-primary">{loc.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-6 border-b border-slate-200 bg-red-50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-semibold">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-white flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-bold text-main hover:bg-slate-100 transition-all active:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCoords}
            className="flex-1 py-3 rounded-xl bg-primary text-white font-bold neomorph-raised active:neomorph-inset transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {selectedCoords ? 'Confirm Location' : 'Select a Location First'}
          </button>
        </div>
      </div>
    </div>
  );
}
