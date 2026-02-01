# Security Guide

## 🔒 Critical Security Setup

This weather application is designed with **security-first principles**. The most critical security feature is that **NO API keys are exposed in client-side code**.

### ⚠️ Required: Setup Secure API Proxy

**You MUST set up a serverless function to proxy API requests.** Never expose your OpenWeatherMap API key directly in the browser.

#### Option 1: Netlify Functions

1. **Create the function file:**
    ```bash
    mkdir -p netlify/functions
    ```
2. Create `netlify/functions/weather.js`:
   ‍‍‍

```js
require('dotenv').config();

const API_KEY = process.env.WEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/3.0';

exports.handler = async (event, context) => {
    try {
        const { httpMethod, queryStringParameters, path } = event;

        // Only allow GET requests
        if (httpMethod !== 'GET') {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: 'Method not allowed' }),
            };
        }

        // Validate API key is set
        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API key not configured' }),
            };
        }

        // Build API URL
        let apiUrl = `${BASE_URL}${path}?${new URLSearchParams(queryStringParameters).toString()}&appid=${API_KEY}`;

        // Make request to OpenWeatherMap
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'WeatherApp/1.0',
            },
        });

        // Check for errors
        if (!response.ok) {
            const errorData = await response.json();
            return {
                statusCode: response.status,
                body: JSON.stringify(errorData),
            };
        }

        // Return weather data
        const data = await response.json();
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            },
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
```

3. Set environment variable in Netlify:

- Go to your Netlify site dashboard
- Settings → Build & deploy → Environment
- Add `WEATHER_API_KEY` with your OpenWeatherMap API key

4. Update `src/js/core/WeatherService.js`:

```js
constructor(apiBase = '/.netlify/functions/weather') {
  this.apiBase = apiBase;
  // ... rest of code
}
```

#### Option 2: Vercel Serverless Functions

1. Create the function file:

```bash
mkdir -p api
```

2. Create `api/weather.js`:

```js
require('dotenv').config();

const API_KEY = process.env.WEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/3.0';

export default async function handler(req, res) {
    try {
        // Only allow GET requests
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // Validate API key
        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Build query string
        const queryParams = new URLSearchParams({
            ...req.query,
            appid: API_KEY,
        });

        // Determine endpoint
        const endpoint = req.query.endpoint || '/onecall';
        const apiUrl = `${BASE_URL}${endpoint}?${queryParams.toString()}`;

        // Fetch weather data
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'WeatherApp/1.0',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        res.setHeader(
            'Cache-Control',
            'public, s-maxage=300, stale-while-revalidate=600'
        );
        res.status(200).json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
```

3. Set environment variable in Vercel:

- Go to your Vercel project dashboard
- Settings → Environment Variables
- Add `WEATHER_API_KEY` with your OpenWeatherMap API key

4. Update `src/js/core/WeatherService.js`:

```js
constructor(apiBase = '/api/weather') {
  this.apiBase = apiBase;
  // ... rest of code
}
```

### 🔐 Environment Variables

Create a `.env` file in the root of your project (this file is gitignored):

```env
# OpenWeatherMap API Key
# Get your free API key at: https://openweathermap.org/api
WEATHER_API_KEY=your_api_key_here

# Application Settings
NODE_ENV=development
```

**Never commit `.env` file to Git!**

### 🛡️ Security Features Implemented

1. No Client-Side API Keys

- All API requests are proxied through serverless functions
- API keys are stored only in environment variables on the server
- Client code never has access to sensitive credentials

2. Input Validation & Sanitization

- All user inputs are validated before processing
- XSS protection on all string inputs
- SQL injection prevention through parameterized queries
- Coordinate validation to prevent invalid requests

3. Content Security Policy (CSP)

- Configured in `netlify.toml`:

```toml
Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.openweathermap.org https://ipapi.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
```

4. Security Headers

- All headers are configured in netlify.toml:
- X-Frame-Options: Prevents clickjacking
- X-Content-Type-Options: Prevents MIME type sniffing
- X-XSS-Protection: Enables XSS filter
- Strict-Transport-Security: Enforces HTTPS
- Referrer-Policy: Controls referrer information
- Permissions-Policy: Restricts browser features

5. Rate Limiting

- Client-side request throttling (1 request/second)
- Serverless function rate limiting can be added
- Cache validation to reduce unnecessary requests

6. Encrypted Local Storage

- Favorites and user preferences are encrypted before storage
- Uses Web Crypto API for AES-GCM encryption
- Device-specific key derivation for added security

7. Secure Communication

- All API requests use HTTPS
- CORS headers properly configured
- Request validation on server side

### 🚨 Security Best Practices

1. Keep Dependencies Updated

```bash
npm update
npm audit fix
```

2. Regular Security Audits

```bash
npm audit
```

3. Monitor API Usage

- Track API request patterns
- Set up alerts for unusual activity
- Monitor rate limits

4. Rotate API Keys Regularly

- Change API keys every 3-6 months
- Revoke compromised keys immediately

5. Enable HTTPS Only

- Force HTTPS in production
- Use HSTS headers (configured in netlify.toml)

6. Implement Error Logging

- Log security events
- Monitor for suspicious activity
- Set up alerts for errors

### 🐛 Reporting Security Issues

If you discover a security vulnerability:

1. DO NOT create a public GitHub issue
2. DO email: senior.farid72@gmail.com
3. Include details about the vulnerability
4. Allow time for patching before public disclosure

### 🔍 Security Checklist

- API key stored in environment variables only
- Serverless function deployed and tested
- HTTPS enforced in production
- Security headers configured
- Input validation implemented
- XSS protection enabled
- Rate limiting configured
- Dependencies up to date
- Error logging implemented
- Regular security audits scheduled

### 📚 Additional Resources

- OpenWeatherMap API Security
- OWASP Top 10
- Web Security Guidelines
- Netlify Security Documentation
- Vercel Security Documentation

---

**Remember**: Security is an ongoing process, not a one-time setup. Regular reviews and updates are essential for maintaining a secure application.
