import { defineConfig } from 'vite';

export default defineConfig({
    base: './', // 確保在 GitHub Pages 的子路徑下能正確讀取資源
    build: {
        outDir: 'dist',
    }
});
