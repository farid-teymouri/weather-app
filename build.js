/**
 * Custom Build Script
 * Asset optimization and preprocessing
 */

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';
import CleanCSS from 'clean-css';
import { optimize } from 'svgo';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
    srcDir: join(__dirname, 'src'),
    distDir: join(__dirname, 'dist'),
    publicDir: join(__dirname, 'public'),
    minify: true,
    optimizeImages: true,
};

/**
 * Minify JavaScript
 * @param {string} code - JavaScript code
 * @returns {Promise<string>} Minified code
 */
async function minifyJS(code) {
    if (!CONFIG.minify) return code;

    try {
        const result = await minify(code, {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.debug'],
            },
            mangle: true,
            output: {
                comments: false,
            },
        });

        return result.code;
    } catch (error) {
        console.error('JS minification error:', error);
        return code;
    }
}

/**
 * Minify CSS
 * @param {string} code - CSS code
 * @returns {string} Minified CSS
 */
function minifyCSS(code) {
    if (!CONFIG.minify) return code;

    try {
        const result = new CleanCSS({}).minify(code);
        return result.styles;
    } catch (error) {
        console.error('CSS minification error:', error);
        return code;
    }
}

/**
 * Optimize SVG
 * @param {string} svg - SVG content
 * @returns {Promise<string>} Optimized SVG
 */
async function optimizeSVG(svg) {
    if (!CONFIG.optimizeImages) return svg;

    try {
        const result = optimize(svg, {
            plugins: [
                { name: 'preset-default' },
                { name: 'removeDimensions' },
                { name: 'removeViewBox', active: false },
                { name: 'cleanupIds', params: { minify: true } },
            ],
        });

        return result.data;
    } catch (error) {
        console.error('SVG optimization error:', error);
        return svg;
    }
}

/**
 * Copy and optimize assets
 */
async function copyAssets() {
    const assetsDir = join(CONFIG.srcDir, 'assets');
    const distAssetsDir = join(CONFIG.distDir, 'assets');

    try {
        // Create assets directory
        await mkdir(distAssetsDir, { recursive: true });

        // Copy icons
        const iconsDir = join(assetsDir, 'icons');
        const distIconsDir = join(distAssetsDir, 'icons');
        await mkdir(distIconsDir, { recursive: true });

        const icons = await readdir(iconsDir, { withFileTypes: true });
        for (const icon of icons) {
            if (icon.isFile() && icon.name.endsWith('.svg')) {
                const iconPath = join(iconsDir, icon.name);
                const svgContent = await readFile(iconPath, 'utf8');
                const optimizedSvg = await optimizeSVG(svgContent);
                await writeFile(join(distIconsDir, icon.name), optimizedSvg);
            }
        }

        console.log('✓ Assets optimized and copied');
    } catch (error) {
        console.error('Asset copy error:', error);
    }
}

/**
 * Build CSS bundle
 */
async function buildCSS() {
    const cssDir = join(CONFIG.srcDir, 'css');
    const distCSSDir = join(CONFIG.distDir, 'css');

    try {
        await mkdir(distCSSDir, { recursive: true });

        // Read and combine CSS files
        const cssFiles = [
            '_variables.css',
            '_base.css',
            '_layout.css',
            '_components.css',
            '_utilities.css',
            'main.css',
        ];
        let cssBundle = '';

        for (const file of cssFiles) {
            const filePath = join(cssDir, file);
            const content = await readFile(filePath, 'utf8');
            cssBundle += `\n/* ${file} */\n${content}\n`;
        }

        // Minify
        const minifiedCSS = minifyCSS(cssBundle);

        // Write to dist
        await writeFile(join(distCSSDir, 'bundle.min.css'), minifiedCSS);

        console.log('✓ CSS bundle created');
    } catch (error) {
        console.error('CSS build error:', error);
    }
}

/**
 * Build JavaScript bundle
 */
async function buildJS() {
    // Vite handles JS bundling, this is a placeholder for custom processing
    console.log('✓ JavaScript bundle created (via Vite)');
}

/**
 * Copy HTML and static files
 */
async function copyStaticFiles() {
    try {
        // Copy index.html
        const indexPath = join(CONFIG.publicDir, 'index.html');
        const indexContent = await readFile(indexPath, 'utf8');
        await writeFile(join(CONFIG.distDir, 'index.html'), indexContent);

        // Copy manifest.json
        const manifestPath = join(CONFIG.publicDir, 'manifest.json');
        const manifestContent = await readFile(manifestPath, 'utf8');
        await writeFile(join(CONFIG.distDir, 'manifest.json'), manifestContent);

        // Copy service-worker.js
        const swPath = join(CONFIG.publicDir, 'service-worker.js');
        const swContent = await readFile(swPath, 'utf8');
        await writeFile(join(CONFIG.distDir, 'service-worker.js'), swContent);

        // Copy icons
        const iconsDir = join(CONFIG.publicDir, 'icons');
        const distIconsDir = join(CONFIG.distDir, 'icons');
        await mkdir(distIconsDir, { recursive: true });

        const icons = await readdir(iconsDir);
        for (const icon of icons) {
            if (icon.endsWith('.svg')) {
                const iconContent = await readFile(join(iconsDir, icon), 'utf8');
                const optimized = await optimizeSVG(iconContent);
                await writeFile(join(distIconsDir, icon), optimized);
            }
        }

        console.log('✓ Static files copied');
    } catch (error) {
        console.error('Static file copy error:', error);
    }
}

/**
 * Generate sitemap.xml
 */
async function generateSitemap() {
    const baseUrl = 'https://weather-app.example.com'; // Replace with your domain
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>`;

    await writeFile(join(CONFIG.distDir, 'sitemap.xml'), sitemap);
    console.log('✓ Sitemap generated');
}

/**
 * Generate robots.txt
 */
async function generateRobotsTxt() {
    const robots = `User-agent: *
Allow: /
Disallow: /private/

Sitemap: https://weather-app.example.com/sitemap.xml
`;

    await writeFile(join(CONFIG.distDir, 'robots.txt'), robots);
    console.log('✓ Robots.txt generated');
}

/**
 * Main build function
 */
async function build() {
    console.log('🚀 Starting build process...\n');

    try {
        // Clean dist directory
        const { rm } = await import('fs/promises');
        try {
            await rm(CONFIG.distDir, { recursive: true, force: true });
        } catch (error) {
            // Directory might not exist, that's okay
        }

        await mkdir(CONFIG.distDir, { recursive: true });

        // Build steps
        await copyStaticFiles();
        await buildCSS();
        await buildJS();
        await copyAssets();
        await generateSitemap();
        await generateRobotsTxt();

        console.log('\n✅ Build completed successfully!');
        console.log(`📦 Output directory: ${CONFIG.distDir}`);
    } catch (error) {
        console.error('\n❌ Build failed:', error);
        process.exit(1);
    }
}

// Run build if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    build();
}

export default build;
