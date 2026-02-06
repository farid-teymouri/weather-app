# 🌤️ Weather Application

A professional, fully-featured weather application built with **vanilla JavaScript** that demonstrates modern web development best practices including modular architecture, accessibility, responsive design, and performance optimization. Designed with security-first principles—**zero API keys exposed in client code**.

![Weather App Preview](./public/screenshot.svg)<br>
[![License: MIT](https://img.shields.io/github/license/farid-teymouri/weather-app?color=green&logo=github)](https://github.com/farid-teymouri/weather-app/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/farid-teymouri/weather-app?logo=github)](https://github.com/farid-teymouri/weather-app/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/farid-teymouri/weather-app?logo=github)](https://github.com/farid-teymouri/weather-app/network)
[![GitHub issues](https://img.shields.io/github/issues/farid-teymouri/weather-app?logo=github)](https://github.com/farid-teymouri/weather-app/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/farid-teymouri/weather-app?logo=github)](https://github.com/farid-teymouri/weather-app/commits/main)
[![PWA](https://img.shields.io/badge/PWA-Enabled-brightgreen?logo=pwa)](https://web.dev/progressive-web-apps/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-blue?logo=accessibility)](https://www.w3.org/WAI/WCAG21/quickref/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=ffffff)](https://vercel.com)

## 🌐 Live Demo

Experience the application live with scientifically accurate weather data:

[![Live Demo](https://img.shields.io/badge/Demo-Live%20on%20Vercel-000000?logo=vercel&logoColor=ffffff)](https://weather-app-coral-nu-37.vercel.app)

🔗 **Direct Link**: https://weather-app-coral-nu-37.vercel.app

✨ Features in live demo:

- **Accurate Climate Data**: Verified February averages by latitude/hemisphere (Tehran: 3-8°C, Berlin: -5-2°C)
- **Precise Local Time**: 24-hour format with correct timezone (Tehran UTC+3:30)
- **Dynamic Weather Icons**: Day/night variants + time-of-day conditions (morning clear → afternoon clouds)
- **7-Day Forecast**: Temperature ranges with condition-appropriate icons
- **Geolocation**: Automatic location detection with permission handling
- **Search & Autocomplete**: City search with debounced API calls
- **Unit Conversion**: Toggle between Metric (°C) and Imperial (°F)
- **PWA Capabilities**: Installable on any device
- **WCAG 2.1 AA Compliant**: Full keyboard navigation + screen reader support

## 🚫 Important Notice: DO NOT OPEN `public/index.html` DIRECTLY!

This project **requires a build step**. Opening `public/index.html` directly in browser **WILL NOT WORK** because:

- Assets are optimized and moved to `dist/` during build
- HTML paths are corrected by `scripts/fix-html-paths.js`
- Vercel Edge Functions (`/api/*`) only work in deployed environment

✅ **CORRECT INSTALLATION** (required):

```bash
git clone https://github.com/farid-teymouri/weather-app.git
cd weather-app
npm install          # Install dependencies
npm run build        # Build optimized files to dist/
npx http-server dist # Serve built files (port 8080)
```

Then open http://localhost:8080 in browser. <br>
**❌ WRONG (will fail):**

```bash
# DO NOT DO THIS:
open public/index.html  # Broken paths, missing assets, no API endpoints
```

## 🌟 Key Features

### 🌍 Scientifically Accurate Weather

- **Geolocation Detection**: Automatic location detection with permission handling
- **Search & Autocomplete**: City search with debounced API calls
- **7-Day Forecast**: Detailed daily predictions with weather icons
- **Timezone-Aware Local Time**: Correct UTC offsets - 24-hour format (HH:mm) independent of browser timezone
- **Unit Conversion**: Toggle between Metric (°C) and Imperial (°F)

### 🎨 User Experience

- **Fully Responsive**: Mobile (320px+), tablet, desktop
- **PWA Ready**: Install as native app on any device
- **Dark/Light Mode**: System-preference aware theming
- **Accessibility First**: WCAG 2.1 AA compliant (keyboard nav, ARIA labels, reduced motion)
- **Loading States**: Skeleton screens + perceptible indicators
- **Toast Notifications**: Accessible feedback for all actions

### 🔒 Security & Performance

- **Zero API Key Exposure**: Secure proxy via Vercel Edge Functions
- **XSS Protection**: Input sanitization on all user inputs
- **Request Throttling**: Rate limiting + cache validation
- **Optimized Assets**: Minified CSS/JS, SVG icons, lazy loading
- **Service Worker**: Offline caching (stale-while-revalidate)

## 🎯 Tech Stack

| Technology             | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| **Vanilla JavaScript** | ES6+ modules, zero frameworks                        |
| **CSS3**               | Custom properties, container queries, reduced-motion |
| **SVG**                | Scalable weather icons and UI elements               |
| **Service Worker**     | Offline caching strategy (stale-while-revalidate)    |
| **Web Manifest**       | PWA installation capabilities                        |
| **Geolocation API**    | Secure location detection                            |
| **localStorage**       | Encrypted favorites storage                          |

## 📁 Project Structure

```bash
weather-app/
├── api/                    # Vercel Edge Functions
│   ├── search.js          # Geocoding search endpoint (OpenStreetMap)
│   └── weather.js          # Secure weather API proxy
├── public/                 # Static assets (served directly)
│   ├── icons/
│   ├── index.html          # Semantic HTML5 structure
│   ├── manifest.json       # PWA manifest
│   ├── screenshot.svg      # App preview
│   └── service-worker.js   # Advanced caching strategy
├── scripts/
│   └── fix-html-paths.js   # Utility script for correcting asset paths in HTML
├── src/
│   ├── assets/             # Source assets (processed during build)
│   ├── css/                # CSS modules (BEM architecture)
│   └── js/
│       ├── core/           # Business logic (zero DOM access)
│       ├── ui/             # Pure presentation layer
│       ├── utils/          # Utility modules
│       └── main.js         # Dependency injection entry point
├── .editorconfig
├── .eslintignore           # (optional, if needed alongside .eslintrc.js)
├── .eslintrc.js            # ESLint configuration (root-level)
├── .gitignore
├── .nvmrc                  # Node.js version specification
├── .prettierrc
├── .vercelignore           # Vercel deployment ignore rules
├── build.js                # Asset optimization pipeline
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
├── README.md
├── SECURITY.md             # Critical security setup guide
├── vercel.json             # Vercel deployment configuration
└── vite.config.js          # Vite build configuration
```

## 🚀 Getting Started

### Prerequisites

- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Node.js 18+ (optional, for development tools)
- **OpenWeatherMap API key** (for backend proxy - [get free key](https://openweathermap.org/api))

## 📖 Full security setup guide: See SECURITY.md

### Installation

#### Quick Start (No Node.js)

```bash
git clone https://github.com/farid-teymouri/weather-app.git
cd weather-app
# Open public/index.html directly in browser
```

#### Development Mode

```bash
git clone https://github.com/farid-teymouri/weather-app.git
cd weather-app
npm install
npm run dev  # Starts dev server at http://localhost:5173
```

#### Build for Production

```bash
npm run build  # Creates optimized dist/ folder
npm run preview # Preview production build
```

#### 🚀 Deployment to Vercel (1-Click)

1. Push code to GitHub repository
2. Import project in <a href="https://vercel.com/new" target="_blank" >Vercel Dashboard</a>
3. Set environment variable (if using real API):
    - `WEATHER_API_KEY` = Your OpenWeatherMap API key
4. Deploy! Vercel automatically:
    - Runs `npm run build`
    - Deploys `dist/` as root
    - Routes `/api/\*` to Edge Functions in `api/`
    - Applies security headers from ‍`vercel.json`

#### 🔗 Zero-config deployment: `vercel.json` handles all routing and headers

## 🎨 Customization Guide

### Change Color Scheme

#### Edit `src/css/_variables.css`:

```css
:root {
    --color-primary: #4c6fff; /* Main accent color */
    --color-secondary: #8c52ff; /* Secondary accent */
    --color-sunny: #f6ad55; /* Weather-specific colors */
    /* ... update all semantic color variables */
}
```

### Modify Cache Strategy

#### Edit `public/service-worker.js`:

```js
const CACHE_DURATION = 300000; // 5 minutes - adjust as needed
```

## 🌐 Browser Support

| Browser        | Version | Support |
| -------------- | ------- | ------- |
| **Chrome**     | 90+     | ✅ Full |
| **Firefox**    | 88+     | ✅ Full |
| **Safari**     | 14+     | ✅ Full |
| **Edge**       | 90+     | ✅ Full |
| **Opera**      | 76+     | ✅ Full |
| **iOS Safari** | 14+     | ✅ Full |

## 🤝 Contributing

#### Contributions welcome! Please follow:

1. Fork the repository
2. Create feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push branch (`git push origin feat/amazing-feature`)
5. Open Pull Request

#### Code Standards:

1. Follow existing architecture patterns
2. Run ‍‍`npm run format` before committing
3. Include accessibility considerations
4. Add tests for new functionality

## 🐛 Troubleshooting

| Issue                      | Solution                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| **Blank page on load**     | ❌ DO NOT open `public/index.html` directly <br> ✅ Run `npm run build` then serve `dist/` |
| **Weather not loading**    | Check browser console → Verify `/api/weather` returns 200 (Vercel deployed)                |
| **Icons not showing**      | Verify `dist/icons/weather-icons/` contains SVG files (build step copies them)             |
| **Time shows wrong value** | Confirm `weatherData.timezone = 12600` for Tehran (UTC+3:30)                               |
| **Search not working**     | Check Network tab → `/api/search` must return 200 with results array                       |

## 📜 License

MIT License - see <a href="https://github.com/farid-teymouri/weather-app/raw/refs/heads/main/LICENSE" target="_blank">LICENSE</a> file for details.

```text
MIT License

Copyright (c) 2026 Farid Teymouri

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 👨‍💻 Author

#### Farid Teymouri

📧 senior.farid72@gmail.com <br>
🌐 <a href="https://faridteymouri.vercel.app" target="_balnk">Portfolio website</a> <br>

## 🙏 Acknowledgments

- Weather data from OpenWeatherMap
- Icons from Heroicons and Weather Icons
- CSS architecture inspired by Tailwind CSS
- Accessibility guidance from WebAIM and WCAG
- PWA best practices from web.dev
- Built with ❤️ using vanilla JavaScript - no frameworks

---

⭐ **If you found this project helpful, please give it a star!** ⭐ <br>
🐞 Found an issue? <a href="https://github.com/farid-teymouri/weather-app/issues" target="_balnk">Open a GitHub issue </a><br>
💡 Have an idea? <a href="https://github.com/farid-teymouri/weather-app/issues/new" target="_balnk">Submit a feature request</a>
