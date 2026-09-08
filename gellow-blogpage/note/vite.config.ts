import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { copyFileSync } from 'node:fs';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue(), { name: 'note-deployment-config', closeBundle() {
    copyFileSync(fileURLToPath(new URL('./vercel.json', import.meta.url)), fileURLToPath(new URL('../note-dist/vercel.json', import.meta.url)));
    copyFileSync(fileURLToPath(new URL('./.vercelignore', import.meta.url)), fileURLToPath(new URL('../note-dist/.vercelignore', import.meta.url)));
  } }],
  publicDir: false,
  build: { outDir: '../note-dist', emptyOutDir: true },
});
