/**
 * Vite Configuration
 * Build and development server configuration
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    base: '/',
    publicDir: './public',

    build: {
        outDir: '../dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'public/index.html'),
            },
            output: {
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash].[ext]',
            },
        },
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
        sourcemap: false,
        reportCompressedSize: true,
    },

    server: {
        port: 5173,
        open: true,
        strictPort: true,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false,
            },
        },
    },

    optimizeDeps: {
        include: [],
    },

    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@js': resolve(__dirname, './src/js'),
            '@css': resolve(__dirname, './src/css'),
            '@assets': resolve(__dirname, './src/assets'),
        },
    },

    define: {
        'process.env': process.env,
    },
});
