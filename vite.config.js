import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    return {
        base: command === 'serve' ? '/' : '/rg-game/',
        build: {
            outDir: 'dist',
        }
    };
});
