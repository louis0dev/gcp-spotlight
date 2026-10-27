import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// 확장 페이지(설정, 대체 창)와 service worker. content script는 단일 IIFE 파일이어야 해서 vite.content.config.ts에서 따로 빌드한다.
export default defineConfig({
  root: r('./src'),
  publicDir: r('./public'),
  build: {
    outDir: r('./dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        options: r('./src/options.html'),
        palette: r('./src/palette.html'),
        background: r('./src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
