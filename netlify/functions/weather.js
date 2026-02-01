/**
 * Netlify Serverless Function
 * Secure proxy for OpenWeatherMap API
 * Prevents API key exposure in client code
 *
 * @param {Object} event - Netlify function event
 * @param {Object} context - Netlify function context
 * @returns {Object} Response object
 */
require('dotenv').config();

// OpenWeatherMap API configuration
const API_KEY = process.env.WEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/3.0';

// Rate limiting configuration
const RATE_LIMIT = {
    maxRequests: 100, // Max requests per window
    windowMs: 60 * 60 * 1000, // 1 hour window
};

// In-memory rate limiting store (for demonstration)
// In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map();

/**
 * Check if request is within rate limit
 * @param {string} ip - Client IP address
 * @returns {Object} Rate limit info
 */
function checkRateLimit(ip) {
    const now = Date.now();
    const clientData = rateLimitStore.get(ip) || { count: 0, resetTime: now + RATE_LIMIT.windowMs };

    // Reset counter if window expired
    if (now > clientData.resetTime) {
        clientData.count = 0;
        clientData.resetTime = now + RATE_LIMIT.windowMs;
    }

    // Check if limit exceeded
    if (clientData.count >= RATE_LIMIT.maxRequests) {
        return {
            allowed: false,
            resetIn: Math.ceil((clientData.resetTime - now) / 1000),
        };
    }

    // Increment counter
    clientData.count++;
    rateLimitStore.set(ip, clientData);

    return {
        allowed: true,
        remaining: RATE_LIMIT.maxRequests - clientData.count,
        resetIn: Math.ceil((clientData.resetTime - now) / 1000),
    };
}

/**
 * Validate query parameters
 * @param {Object} params - Query parameters
 * @returns {Object} Validation result
 */
function validateParams(params) {
    const errors = [];

    // Validate latitude and longitude
    if (params.lat || params.lon) {
        const lat = parseFloat(params.lat);
        const lon = parseFloat(params.lon);

        if (isNaN(lat) || lat < -90 || lat > 90) {
            errors.push('Invalid latitude');
        }

        if (isNaN(lon) || lon < -180 || lon > 180) {
            errors.push('Invalid longitude');
        }
    }

    // Validate units
    if (params.units && !['metric', 'imperial'].includes(params.units)) {
        errors.push('Invalid units. Must be "metric" or "imperial"');
    }

    // Validate exclude parameter
    if (params.exclude) {
        const validExcludes = ['current', 'minutely', 'hourly', 'daily', 'alerts'];
        const excludes = params.exclude.split(',');
        const invalid = excludes.filter((e) => !validExcludes.includes(e));
        if (invalid.length > 0) {
            errors.push(`Invalid exclude parameters: ${invalid.join(', ')}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors,
    };
}

/**
 * Main handler function
 * @param {Object} event - Netlify event object
 * @returns {Object} Response object
 */
exports.handler = async (event, context) => {
    try {
        const { httpMethod, queryStringParameters = {}, headers, path } = event;

        // Get client IP for rate limiting
        const clientIp = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';

        console.log(`[Weather Function] Request from ${clientIp}: ${path}`);

        // 1. Check HTTP method
        if (httpMethod !== 'GET') {
            return {
                statusCode: 405,
                body: JSON.stringify({
                    error: 'Method not allowed',
                    allowed: ['GET'],
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            };
        }

        // 2. Check rate limit
        const rateLimit = checkRateLimit(clientIp);
        if (!rateLimit.allowed) {
            return {
                statusCode: 429,
                body: JSON.stringify({
                    error: 'Too many requests',
                    retryAfter: rateLimit.resetIn,
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': rateLimit.resetIn.toString(),
                },
            };
        }

        // 3. Validate API key
        if (!API_KEY) {
            console.error('[Weather Function] API key not configured');
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'API key not configured. Please set WEATHER_API_KEY environment variable.',
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            };
        }

        // 4. Validate query parameters
        const validation = validateParams(queryStringParameters);
        if (!validation.valid) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid parameters',
                    details: validation.errors,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            };
        }

        // 5. Build API URL
        // Extract the endpoint from the path (e.g., "/weather" or "/forecast")
        const endpoint = path.replace('/.netlify/functions/weather', '');
        const apiUrl = `${BASE_URL}${endpoint || '/onecall'}?${new URLSearchParams({
            ...queryStringParameters,
            appid: API_KEY,
        }).toString()}`;

        console.log(`[Weather Function] Fetching from ${endpoint}`);

        // 6. Make request to OpenWeatherMap
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'WeatherFlow/1.0',
                Accept: 'application/json',
            },
            timeout: 10000, // 10 second timeout
        });

        // 7. Handle API errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`[Weather Function] OpenWeatherMap API error: ${response.status}`, errorData);

            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: 'Weather API error',
                    details: errorData.message || 'Unknown error',
                    cod: errorData.cod,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            };
        }

        // 8. Return successful response
        const data = await response.json();

        console.log(`[Weather Function] Successfully fetched weather data`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
                'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                'X-RateLimit-Reset': rateLimit.resetIn.toString(),
            },
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('[Weather Function] Internal error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }
};
