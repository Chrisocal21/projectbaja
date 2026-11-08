import { defineConfig } from 'vite';

// es2022: worlds/county.js loads the county heightmap with a top-level await before anything reads the terrain
export default defineConfig({
  build: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
});
