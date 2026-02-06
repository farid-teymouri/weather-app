// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/',
    publicDir: 'public', // Static assets copied from here

    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        //  MUST point to public/index.html
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'public/index.html'), // Process this file
            },
            output: {
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) {
                        return 'assets/[name].[hash].css';
                    }
                    return 'assets/[name].[hash].[ext]';
                },
            },
        },
        minify: 'terser',
        terserOptions: {
            compress: { drop_console: true, drop_debugger: true },
        },
        sourcemap: false,
    },

    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@js': resolve(__dirname, './src/js'),
            '@css': resolve(__dirname, './src/css'),
        },
    },
});
