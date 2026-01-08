import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        // Enable React Refresh for fast HMR
        fastRefresh: true,
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/lib': path.resolve(__dirname, './src/lib'),
        '@/pages': path.resolve(__dirname, './src/pages'),
        '@/stores': path.resolve(__dirname, './src/stores'),
      },
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    preview: {
      port: 4173,
      strictPort: true,
    },

    build: {
      // Target modern browsers for smaller bundle size
      target: 'esnext',
      // Enable source maps for debugging
      sourcemap: true,
      // Rollup options for better code splitting
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
            'flow-vendor': ['@xyflow/react', '@dagrejs/dagre'],
          },
        },
      },
      // Chunk size warning limit (in kB)
      chunkSizeWarningLimit: 1000,
    },

    // Optimize dependency pre-bundling
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@xyflow/react',
        'zustand',
      ],
    },

    // Enable CSS code splitting
    css: {
      devSourcemap: true,
    },

    // Environment variable prefix
    envPrefix: 'VITE_',
  };
});
