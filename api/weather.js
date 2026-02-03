// api/weather.js - MINIMAL WORKING VERSION WITH CORS
export const config = { runtime: 'edge' };

export default async function handler(request) {
    // ALWAYS set CORS headers first
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Critical for browser requests
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers, status: 204 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get('lat');
        const lon = searchParams.get('lon');
        const units = searchParams.get('units') || 'metric';
        const type = searchParams.get('type') || 'current';

        if (!lat || !lon) {
            return new Response(JSON.stringify({ error: 'Missing coordinates' }), {
                status: 400,
                headers,
            });
        }

        // Get API key from Vercel environment
        const API_KEY = process.env.WEATHER_API_KEY;
        if (!API_KEY) {
            console.error('❌ WEATHER_API_KEY not set in Vercel environment variables!');
            return new Response(
                JSON.stringify({
                    error: 'API configuration missing',
                    fix: 'Set WEATHER_API_KEY in Vercel Dashboard → Settings → Environment Variables',
                }),
                { status: 500, headers }
            );
        }

        // Build API URL based on type
        const baseUrl =
            type === 'forecast'
                ? 'https://api.openweathermap.org/data/2.5/forecast'
                : 'https://api.openweathermap.org/data/2.5/weather';

        const params = new URLSearchParams({
            lat,
            lon,
            units,
            appid: API_KEY,
            ...(type === 'forecast' && { cnt: '40' }), // 5 days of 3-hour data
        });

        // Fetch from OpenWeatherMap
        const response = await fetch(`${baseUrl}?${params}`, {
            headers: { 'User-Agent': 'WeatherApp/1.0' },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ status: response.status }));
            console.error('OpenWeatherMap API error:', error);

            // Return mock data on API failure (prevents app crash)
            return new Response(JSON.stringify(getMockResponse(type, lat, lon, units)), {
                status: 200,
                headers,
            });
        }

        const data = await response.json();

        // Transform response to match frontend expectations
        const result = type === 'forecast' ? { daily: transformForecast(data.list) } : transformCurrent(data);

        return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
        console.error('Edge Function error:', error);

        // ALWAYS return mock data on ANY error (prevents app crash)
        return new Response(JSON.stringify(getMockResponse('current', 35.6892, 51.389, 'metric')), {
            status: 200,
            headers,
        });
    }
}

// ===== HELPER FUNCTIONS (MINIMAL) =====
function transformCurrent(data) {
    return {
        name: data.name,
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
                    night: item.main.temp,
                    eve: item.main.temp,
                    morn: item.main.temp,
                },
                feels_like: { day: item.main.feels_like },
                pressure: item.main.pressure,
                humidity: item.main.humidity,
                wind_speed: item.wind.speed,
                wind_deg: item.wind.deg,
                weather: item.weather,
                clouds: item.clouds.all,
                pop: item.pop || 0,
            };
        }
    });
    return Object.values(days).slice(0, 7);
}

function getMockResponse(type, lat, lon, units) {
    // Simplified Tehran mock data
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
              main: { temp: 9, feels_like: 6, temp_min: 7, temp_max: 11, pressure: 1020, humidity: 45 },
              weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
              wind: { speed: 3.2, deg: 315 },
              clouds: { all: 40 },
              dt: Math.floor(Date.now() / 1000),
              timezone: 12600,
              coord: { lat: 35.6892, lon: 51.389 },
          };
}
