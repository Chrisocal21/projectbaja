import { defineConfig } from 'vite';

// es2022: worlds/county.js loads the county heightmap with a top-level await before anything reads the terrain
// BUILD_ID: stamped into the bundle and written to dist/version.json so a running game can notice a newer release (game/update.jsx)
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 8) + '-' + Date.now();
const versionFile = { name: 'baja-version-file', apply: 'build', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) }); } };
export default defineConfig({
  plugins: [versionFile],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  build: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
});
