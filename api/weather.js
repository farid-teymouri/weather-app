/**
 * Vercel Edge Function for Weather API Proxy
 * MUST have export const config for Edge Runtime
 */
export const config = {
    runtime: 'edge', // ✅ CRITICAL: Enables Vercel Edge Runtime
    regions: ['iad1', 'sfo1', 'fra1', 'hnd1'], // Global edge locations
};

export default async function handler(request) {
    // Parse query parameters
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

    // ✅ CRITICAL: Get API key from Vercel environment variables
    const API_KEY = process.env.WEATHER_API_KEY;

    if (!API_KEY) {
        console.error('[Edge Function] WEATHER_API_KEY not configured in Vercel environment variables');
        return new Response(
            JSON.stringify({
                error: 'Weather API key not configured',
                fix: 'Set WEATHER_API_KEY in Vercel Dashboard → Settings → Environment Variables',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Build API URL
    const params = new URLSearchParams({
        lat,
        lon,
        units,
        exclude,
        appid: API_KEY,
    });

    const apiUrl = `https://api.openweathermap.org/data/3.0/onecall?${params.toString()}`;

    try {
        // Fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(apiUrl, {
            headers: { 'User-Agent': 'WeatherFlow/1.0' },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`[Edge Function] OpenWeatherMap error ${response.status}:`, errorData);

            // Handle specific API errors
            if (response.status === 401) {
                return new Response(
                    JSON.stringify({
                        error: 'Invalid API key',
                        fix: 'Check WEATHER_API_KEY in Vercel environment variables',
                    }),
                    { status: 401, headers: { 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({
                    error: 'Weather service unavailable',
                    details: errorData.message || 'Service temporarily down',
                }),
                { status: response.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Return successful response with caching headers
        const data = await response.json();
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
        console.error('[Edge Function] Critical error:', error);

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
