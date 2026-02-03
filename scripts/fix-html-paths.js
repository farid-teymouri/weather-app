// scripts/fix-html-paths.js
import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync, cpSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔧 Fixing HTML asset paths for Vercel deployment...');

// Read built HTML from dist/public/index.html
const builtHtmlPath = join(rootDir, 'dist', 'public', 'index.html');
if (!existsSync(builtHtmlPath)) {
    console.error('❌ ERROR: dist/public/index.html not found after build');
    console.error('   Check vite.config.js rollupOptions.input configuration');
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
    .replace(/href="\.\/manifest\.json"/g, 'href="/manifest.json"')
    .replace(/src="\.\/service-worker\.js"/g, 'src="/service-worker.js"');

// Write corrected HTML to dist/index.html
const finalHtmlPath = join(rootDir, 'dist', 'index.html');
writeFileSync(finalHtmlPath, html);
console.log(`✅ Fixed index.html paths: JS=${jsFile}, CSS=${cssFile}`);

// CRITICAL FIX: Move ALL static assets from dist/public to dist (not just index.html!)
const publicDir = join(rootDir, 'dist', 'public');
const distDir = join(rootDir, 'dist');

// Create dist directory if it doesn't exist
if (!existsSync(distDir)) mkdirSync(distDir);

// Copy all files/directories from dist/public to dist (except index.html which we already moved)
const publicItems = readdirSync(publicDir, { withFileTypes: true });
publicItems.forEach((item) => {
    if (item.name === 'index.html') return; // Skip - already processed

    const srcPath = join(publicDir, item.name);
    const destPath = join(distDir, item.name);

    try {
        cpSync(srcPath, destPath, { recursive: true });
        console.log(`✅ Copied ${item.name} to dist/`);
    } catch (err) {
        console.warn(`⚠️  Warning: Could not copy ${item.name}: ${err.message}`);
    }
});

// Clean up dist/public directory AFTER copying everything
try {
    rmSync(publicDir, { recursive: true, force: true });
    console.log('✅ Cleaned up dist/public directory');
} catch (err) {
    console.warn(`⚠️  Warning: Could not remove dist/public: ${err.message}`);
}

// Verification: Check critical files exist in dist/
const criticalFiles = ['index.html', 'manifest.json', 'service-worker.js', 'icons/icon-192.svg', 'icons/icon-512.svg'];

console.log('\n🔍 Verification - Critical files in dist/:');
criticalFiles.forEach((file) => {
    const exists = existsSync(join(distDir, file));
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) {
        console.error(`    → MISSING! This will break deployment!`);
        process.exit(1);
    }
});

console.log('\n✅ BUILD SUCCESS:');
console.log(`   Main script: /assets/${jsFile}`);
console.log(`   Main styles: /assets/${cssFile}`);
console.log(`   Output structure: dist/ (ready for Vercel)`);
console.log(`   All static assets preserved in dist/`);
