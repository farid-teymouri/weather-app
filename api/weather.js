/**
 * Vercel Edge Function for Weather API Proxy
 * Securely proxies requests to OpenWeatherMap without exposing API key
 * Uses Vercel Edge Runtime for ultra-fast global responses
 *
 * @param {Request} request - Incoming request
 * @returns {Response} Weather data response
 */
export const config = {
    runtime: 'edge',
    regions: ['iad1', 'sfo1', 'fra1', 'hnd1'], // Global edge locations
};

export default async function handler(request) {
    // Parse query parameters safely
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const units = searchParams.get('units') || 'metric';
    const exclude = searchParams.get('exclude') || 'minutely,hourly';

    // Validate required parameters
    if (!lat || !lon) {
        return new Response(JSON.stringify({ error: 'Latitude and longitude are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Get API key from Vercel environment variables
    const API_KEY = process.env.WEATHER_API_KEY;
    if (!API_KEY) {
        console.error('[Vercel Function] WEATHER_API_KEY not configured');
        return new Response(
            JSON.stringify({
                error: 'API key not configured. Please set WEATHER_API_KEY in Vercel project settings.',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Build secure API URL
    const params = new URLSearchParams({
        lat,
        lon,
        units,
        exclude,
        appid: API_KEY,
    });

    const apiUrl = `https://api.openweathermap.org/data/3.0/onecall?${params.toString()}`;

    try {
        // Fetch weather data with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const weatherResponse = await fetch(apiUrl, {
            headers: { 'User-Agent': 'WeatherFlow/1.0' },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!weatherResponse.ok) {
            const errorData = await weatherResponse.json().catch(() => ({}));
            console.error(`[Vercel Function] OpenWeatherMap error ${weatherResponse.status}:`, errorData);
            return new Response(
                JSON.stringify({
                    error: 'Weather service unavailable',
                    details: errorData.message || 'Service temporarily down',
                }),
                { status: weatherResponse.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Return weather data with aggressive caching
        const data = await weatherResponse.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                'X-Weather-Source': 'openweathermap',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('[Vercel Function] Critical error:', error);

        // Handle timeout specifically
        if (error.name === 'AbortError') {
            return new Response(JSON.stringify({ error: 'Request timeout. Please try again.' }), {
                status: 504,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
