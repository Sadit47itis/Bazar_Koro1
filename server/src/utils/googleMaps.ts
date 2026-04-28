import { env } from '../env.js';

interface DistanceResult {
  distanceKm: number;
  distanceMeters: number;
  durationMinutes: number;
  durationText: string;
  status: string;
}

interface GoogleDistanceMatrixResponse {
  status: string;
  error_message?: string;
  rows: Array<{
    elements: Array<{
      status: string;
      distance: { value: number; text: string };
      duration: { value: number; text: string };
    }>;
  }>;
}

interface GoogleGeocodingResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
}

/**
 * Calculate distance between two coordinates using Google Distance Matrix API
 * @param origin [lat, lng] of starting point
 * @param destination [lat, lng] of ending point
 * @returns Distance in km, meters, and estimated travel time
 */
export async function calculateDistanceWithGoogle(
  origin: [number, number],
  destination: [number, number]
): Promise<DistanceResult | null> {
  if (!env.googleMapsApiKey) {
    console.warn('Google Maps API key not configured. Using fallback Haversine calculation.');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json`;
    const params = new URLSearchParams({
      origins: `${origin[0]},${origin[1]}`,
      destinations: `${destination[0]},${destination[1]}`,
      key: env.googleMapsApiKey,
      units: 'metric' // Use kilometers
    });

    const response = await fetch(`${url}?${params}`);
    const data = (await response.json()) as GoogleDistanceMatrixResponse;

    if (data.status !== 'OK' || !data.rows?.[0]?.elements?.[0]) {
      console.error('Google Distance Matrix API error:', data.error_message);
      return null;
    }

    const element = data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      console.warn('Distance calculation failed for coordinates:', element.status);
      return null;
    }

    const distanceMeters = element.distance.value;
    const durationSeconds = element.duration.value;

    return {
      distanceKm: distanceMeters / 1000,
      distanceMeters,
      durationMinutes: Math.round(durationSeconds / 60),
      durationText: element.duration.text,
      status: 'OK'
    };
  } catch (error) {
    console.error('Error calling Google Distance Matrix API:', error);
    return null;
  }
}

/**
 * Get Google Maps embed URL for displaying a location
 * @param lat latitude
 * @param lng longitude
 * @param zoom zoom level (default 15)
 * @returns Embed URL for iframe
 */
export function getGoogleMapsEmbedUrl(
  lat: number,
  lng: number,
  zoom: number = 15
): string {
  if (!env.googleMapsApiKey) {
    console.warn('Google Maps API key not configured');
    return '';
  }

  return `https://www.google.com/maps/embed/v1/view?key=${env.googleMapsApiKey}&center=${lat},${lng}&zoom=${zoom}`;
}

/**
 * Get Google Maps Static Map URL for a location
 * @param lat latitude
 * @param lng longitude
 * @param width width in pixels
 * @param height height in pixels
 * @param zoom zoom level
 * @returns Static map image URL
 */
export function getGoogleMapsStaticUrl(
  lat: number,
  lng: number,
  width: number = 400,
  height: number = 300,
  zoom: number = 15
): string {
  if (!env.googleMapsApiKey) {
    console.warn('Google Maps API key not configured');
    return '';
  }

  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&markers=color:red%7C${lat},${lng}&key=${env.googleMapsApiKey}`;
}

/**
 * Reverse geocoding: Get address from coordinates
 * @param lat latitude
 * @param lng longitude
 * @returns Address string
 */
export async function getAddressFromCoordinates(
  lat: number,
  lng: number
): Promise<string | null> {
  if (!env.googleMapsApiKey) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: env.googleMapsApiKey
    });

    const response = await fetch(`${url}?${params}`);
    const data = (await response.json()) as GoogleGeocodingResponse;

    if (data.status === 'OK' && data.results?.[0]) {
      return data.results[0].formatted_address;
    }

    return null;
  } catch (error) {
    console.error('Error with Google Geocoding API:', error);
    return null;
  }
}

/**
 * Forward geocoding: Get coordinates from address
 * @param address address string
 * @returns [lat, lng] or null
 */
export async function getCoordinatesFromAddress(
  address: string
): Promise<[number, number] | null> {
  if (!env.googleMapsApiKey) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const params = new URLSearchParams({
      address,
      key: env.googleMapsApiKey
    });

    const response = await fetch(`${url}?${params}`);
    const data = (await response.json()) as GoogleGeocodingResponse;

    if (data.status === 'OK' && data.results?.[0]?.geometry) {
      const { lat, lng } = data.results[0].geometry.location;
      return [lat, lng];
    }

    return null;
  } catch (error) {
    console.error('Error with Google Geocoding API:', error);
    return null;
  }
}
