import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    base: '/', // ✅ Essential for Vercel routing
    publicDir: 'public',

    build: {
        outDir: 'dist', // ✅ Must match vercel.json
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'public/index.html'),
            },
        },
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // ✅ Remove console in production
                drop_debugger: true,
            },
        },
        sourcemap: false, // ✅ No source maps in production
        reportCompressedSize: true,
    },

    server: {
        port: 5173,
        open: false, // ✅ Don't auto-open in Vercel build
        strictPort: true,
    },

    // ✅ Critical: Resolve aliases for production
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@js': resolve(__dirname, './src/js'),
            '@css': resolve(__dirname, './src/css'),
        },
    },
});
