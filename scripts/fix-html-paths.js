// scripts/fix-html-paths.js
import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read built HTML from dist/public/index.html
const builtHtmlPath = join(rootDir, 'dist', 'public', 'index.html');
if (!existsSync(builtHtmlPath)) {
    console.error('❌ ERROR: dist/public/index.html not found after build');
    console.error('   Did vite.config.js set rollupOptions.input correctly?');
    process.exit(1);
}

let html = readFileSync(builtHtmlPath, 'utf-8');

// Find hashed asset filenames in dist/assets/
const assetsDir = join(rootDir, 'dist', 'assets');
const assets = readdirSync(assetsDir);
const jsFile = assets.find((f) => f.startsWith('main.') && f.endsWith('.js'));
const cssFile = assets.find((f) => f.startsWith('main.') && f.endsWith('.css'));

if (!jsFile || !cssFile) {
    console.error('❌ ERROR: Could not find hashed assets in dist/assets/');
    process.exit(1);
}

// Replace broken paths with CORRECT hashed paths
html = html
    .replace(/src="\.\.\/src\/js\/main\.js"/g, `src="/assets/${jsFile}"`)
    .replace(/href="\.\.\/src\/css\/main\.css"/g, `href="/assets/${cssFile}"`)
    .replace(/href="\.\/icons\//g, 'href="/icons/')
    .replace(/href="\.\/manifest\.json"/g, 'href="/manifest.json"');

// Write to CORRECT location: dist/index.html
const finalHtmlPath = join(rootDir, 'dist', 'index.html');
writeFileSync(finalHtmlPath, html);

// Clean up wrong location
rmSync(join(rootDir, 'dist', 'public'), { recursive: true, force: true });

console.log('✅ BUILD SUCCESS:');
console.log(`   Script: /assets/${jsFile}`);
console.log(`   Styles: /assets/${cssFile}`);
console.log(`   Output: dist/index.html (moved from dist/public/)`);
