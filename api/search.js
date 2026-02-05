// api/search.js - Geocoding Search Endpoint
export const config = { runtime: 'edge' };

export default async function handler(request) {
    // CORS headers (critical for browser requests)
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache search results 1 hour
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers, status: 204 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10);

        // Validate query
        if (!query || query.length < 2) {
            return new Response(
                JSON.stringify({
                    error: 'Query must be at least 2 characters',
                    results: _getMockResults(query, limit),
                }),
                { status: 400, headers }
            );
        }

        // Get API key
        const API_KEY = process.env.WEATHER_API_KEY;
        if (!API_KEY) {
            console.error('[Search] WEATHER_API_KEY not configured in Vercel');
            return new Response(
                JSON.stringify({
                    error: 'Search service unavailable',
                    fix: 'Set WEATHER_API_KEY in Vercel Dashboard',
                    results: _getMockResults(query, limit),
                }),
                { status: 500, headers }
            );
        }

        // Fetch from OpenWeatherMap Geocoding API
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${API_KEY}`;

        const geoResponse = await fetch(geoUrl, {
            headers: { 'User-Agent': 'WeatherApp/1.0 (Vercel Edge)' },
        });

        if (!geoResponse.ok) {
            const errorData = await geoResponse.json().catch(() => ({}));
            console.error('[Search] Geocoding API error:', errorData);

            // Return mock results on API failure (prevents broken UI)
            return new Response(
                JSON.stringify({
                    error: `Geocoding service error ${geoResponse.status}`,
                    results: _getMockResults(query, limit),
                }),
                { status: 200, headers }
            ); // Return 200 with mock data
        }

        // Process successful response
        const locations = await geoResponse.json();
        const results = locations.map((loc) => ({
            name: loc.name,
            state: loc.state || '',
            country: loc.country,
            lat: loc.lat,
            lon: loc.lon,
        }));

        console.log(`[Search] Found ${results.length} results for "${query}"`);
        // Returns object with results array (your current implementation)
        return new Response(JSON.stringify({ results }), { status: 200, headers });
    } catch (error) {
        console.error('[Search] Edge Function error:', error);

        // ALWAYS return mock results to prevent UI breakage
        return new Response(
            JSON.stringify({
                error: 'Search service temporarily unavailable',
                results: _getMockResults('', 5), // Return sample cities
            }),
            { status: 200, headers }
        );
    }
}

// ===== MOCK SEARCH RESULTS (Fallback for API failures) =====
function _getMockResults(query, limit) {
    const allLocations = [
        { name: 'Tehran', country: 'IR', lat: 35.6892, lon: 51.389 },
        { name: 'New York', state: 'NY', country: 'US', lat: 40.7128, lon: -74.006 },
        { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
        { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
        { name: 'Berlin', country: 'DE', lat: 52.52, lon: 13.405 },
        { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
        { name: 'Cairo', country: 'EG', lat: 30.0444, lon: 31.2357 },
        { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 },
        { name: 'Rio de Janeiro', country: 'BR', lat: -22.9068, lon: -43.1729 },
        { name: 'Mumbai', country: 'IN', lat: 19.076, lon: 72.8777 },
    ];

    if (!query) return allLocations.slice(0, limit);

    const lowerQuery = query.toLowerCase();
    return allLocations
        .filter(
            (loc) =>
                loc.name.toLowerCase().includes(lowerQuery) ||
                loc.country.toLowerCase().includes(lowerQuery) ||
                (loc.state && loc.state.toLowerCase().includes(lowerQuery))
        )
        .slice(0, limit);
}
