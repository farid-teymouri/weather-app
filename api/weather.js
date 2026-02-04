// api/weather.js - DEBUG VERSION WITH MAXIMUM LOGGING
export const config = { runtime: 'edge' };

export default async function handler(request) {
    // ALWAYS set CORS headers first
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Weather-Debug, X-Request-ID',
        'Cache-Control': 'public, max-age=60',
        'X-Edge-Function': 'weather-debug-v1',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers, status: 204 });
    }

    // Generate unique request ID for tracking
    const requestId =
        request.headers.get('X-Request-ID') || `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Log EVERYTHING to Vercel logs
    console.log(`[EDGE-${requestId}] === REQUEST START ===`);
    console.log(`[EDGE-${requestId}] URL:`, request.url);
    console.log(`[EDGE-${requestId}] Method:`, request.method);
    console.log(`[EDGE-${requestId}] Headers:`, Object.fromEntries(request.headers.entries()));

    try {
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get('lat');
        const lon = searchParams.get('lon');
        const units = searchParams.get('units') || 'metric';
        const type = searchParams.get('type') || 'current';

        console.log(`[EDGE-${requestId}] Params: lat=${lat}, lon=${lon}, units=${units}, type=${type}`);

        if (!lat || !lon) {
            console.error(`[EDGE-${requestId}] ❌ ERROR: Missing coordinates`);
            return new Response(
                JSON.stringify({
                    error: 'Missing coordinates',
                    requestId,
                    fix: 'Include lat and lon parameters',
                }),
                { status: 400, headers }
            );
        }

        // Get API key
        const API_KEY = process.env.WEATHER_API_KEY;
        if (!API_KEY) {
            console.error(`[EDGE-${requestId}] ❌ CRITICAL: WEATHER_API_KEY NOT SET IN VERCEL ENVIRONMENT!`);
            return new Response(
                JSON.stringify({
                    error: 'API configuration missing',
                    requestId,
                    fix: 'Set WEATHER_API_KEY in Vercel Dashboard → Settings → Environment Variables',
                    debug: 'Check Vercel project settings',
                }),
                { status: 500, headers }
            );
        }
        console.log(`[EDGE-${requestId}] API Key configured (length: ${API_KEY.length})`);

        // Build URL
        const baseUrl =
            type === 'forecast'
                ? 'https://api.openweathermap.org/data/2.5/forecast'
                : 'https://api.openweathermap.org/data/2.5/weather';

        const params = new URLSearchParams({
            lat,
            lon,
            units,
            appid: API_KEY,
            ...(type === 'forecast' && { cnt: '40' }),
        });
        const apiUrl = `${baseUrl}?${params}`;

        console.log(`[EDGE-${requestId}] Fetching from OpenWeatherMap: ${baseUrl}?[REDACTED]`);

        // Fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const owmResponse = await fetch(apiUrl, {
            headers: { 'User-Agent': 'WeatherApp/1.0 (Vercel Edge)' },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        console.log(`[EDGE-${requestId}] OpenWeatherMap response status: ${owmResponse.status}`);

        if (!owmResponse.ok) {
            const errorText = await owmResponse.text();
            console.error(`[EDGE-${requestId}] ❌ OpenWeatherMap API error ${owmResponse.status}:`, errorText);

            // Return helpful error with mock fallback
            return new Response(
                JSON.stringify({
                    error: `OpenWeatherMap API error ${owmResponse.status}`,
                    requestId,
                    details: errorText.substring(0, 200),
                    mock: true,
                    data: getMockResponse(type, lat, lon, units),
                }),
                { status: 200, headers }
            ); // Return 200 with mock data to prevent app crash
        }

        // Process successful response
        const data = await owmResponse.json();
        console.log(`[EDGE-${requestId}] ✅ OpenWeatherMap returned data (keys: ${Object.keys(data).join(', ')})`);

        const result =
            type === 'forecast'
                ? { daily: transformForecast(data.list), requestId }
                : { ...transformCurrent(data), requestId };

        console.log(`[EDGE-${requestId}] === REQUEST SUCCESS ===`);
        return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
        console.error(`[EDGE-${requestId}] ❌ EDGE FUNCTION CRASH:`, error);

        // ALWAYS return mock data to prevent app crash
        return new Response(
            JSON.stringify({
                ...getMockResponse('current'),
                mock: true,
                requestId,
                error: 'Edge function error',
                message: error.message,
            }),
            { status: 200, headers }
        );
    }
}

// ===== MINIMAL HELPERS (with logging) =====
function transformCurrent(data) {
    return {
        name: data.name || 'Unknown',
        sys: { country: data.sys?.country || 'IR' },
        main: data.main,
        weather: data.weather,
        wind: data.wind,
        clouds: data.clouds,
        dt: data.dt,
        timezone: data.timezone,
        coord: data.coord,
    };
}

function transformForecast(list) {
    const days = {};
    list.forEach((item) => {
        const date = new Date(item.dt * 1000);
        const key = date.toISOString().split('T')[0];
        if (!days[key] || item.dt_txt.includes('12:00:00')) {
            days[key] = {
                dt: item.dt,
                temp: {
                    day: item.main.temp,
                    min: item.main.temp_min,
                    max: item.main.temp_max,
                },
                weather: item.weather,
            };
        }
    });
    return Object.values(days).slice(0, 7);
}

function getMockResponse(type) {
    return type === 'forecast'
        ? {
              daily: Array(7)
                  .fill()
                  .map((_, i) => ({
                      dt: Math.floor(Date.now() / 1000) + i * 86400,
                      temp: { day: 9 + i, min: 7 + i, max: 11 + i },
                      weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
                  })),
          }
        : {
              name: 'Tehran',
              sys: { country: 'IR' },
              main: { temp: 9, feels_like: 6, humidity: 45 },
              weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
              dt: Math.floor(Date.now() / 1000),
              timezone: 12600,
              coord: { lat: 35.6892, lon: 51.389 },
          };
}
