/**
 * Calculate distance in kilometers between two GPS coordinates using Haversine formula
 */
export function calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371; // Earth radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/**
 * Format distance in a user-friendly Thai string
 */
export function formatDistanceThai(distanceKm: number): string {
    if (distanceKm < 1) {
        const meters = Math.round(distanceKm * 1000);
        return `${meters.toLocaleString()} เมตร (${distanceKm.toFixed(3)} กม.)`;
    }
    return `${distanceKm.toFixed(2)} กม.`;
}

/**
 * Parse Google Maps URL or "lat, lng" text into { lat, lng }
 */
export function parseGoogleMapsCoords(
    input: string
): { lat: number; lng: number } | null {
    const raw = input.trim();
    if (!raw) return null;

    // 1. Check !3d<lat>!4d<lng> pattern (exact pin in Google Maps full URLs)
    const pinMatch = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (pinMatch) {
        const lat = parseFloat(pinMatch[1]);
        const lng = parseFloat(pinMatch[2]);
        if (isValidLatLng(lat, lng)) return { lat, lng };
    }

    // 2. Check @<lat>,<lng> pattern in Google Maps URLs
    const atMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        if (isValidLatLng(lat, lng)) return { lat, lng };
    }

    // 3. Check ?q=<lat>,<lng> or ll=<lat>,<lng> or query=<lat>,<lng>
    const queryMatch = raw.match(/(?:q|ll|query|center)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i);
    if (queryMatch) {
        const lat = parseFloat(queryMatch[1]);
        const lng = parseFloat(queryMatch[2]);
        if (isValidLatLng(lat, lng)) return { lat, lng };
    }

    // 4. Plain "13.7563, 100.5018" or "13.7563 100.5018"
    const plainMatch = raw.match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
    if (plainMatch) {
        const lat = parseFloat(plainMatch[1]);
        const lng = parseFloat(plainMatch[2]);
        if (isValidLatLng(lat, lng)) return { lat, lng };
    }

    return null;
}

export function isValidLatLng(lat: number, lng: number): boolean {
    return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
}

