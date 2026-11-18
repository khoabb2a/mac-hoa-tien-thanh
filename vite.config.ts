import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mặc Họa Tiên Thành · Ink Immortal City',
        short_name: 'Mặc Họa',
        description: 'Xây tông môn tiên hiệp trong tranh thủy mặc · Build an immortal sect in ink-wash',
        lang: 'vi',
        theme_color: '#14120F',
        background_color: '#EFE6D2',
        display: 'standalone',
        orientation: 'portrait',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webp,json}'] },
    }),
  ],
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
