import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    open: true, // tự động mở browser
    watch: {
      // Theo dõi thay đổi trong thư mục public để auto-reload
      ignored: ['!**/public/**']
    }
  },
  plugins: [
    {
      name: 'reload-on-public-change',
      handleHotUpdate({ file, server }) {
        if (file.includes('public')) {
          server.ws.send({ type: 'full-reload' });
        }
      }
    },
  ],
  build: {
    // Tối ưu bundle size
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Xóa tất cả console.log trong production
        drop_debugger: true,
        passes: 2,
      },
      mangle: true,
    },
    rollupOptions: {
      output: {
        // Tách Phaser thành chunk riêng để browser cache tốt hơn
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
