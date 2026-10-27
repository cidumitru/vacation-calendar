import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// BASE_PATH is set by the GitHub Pages workflow to "/<repo-name>/" so that
// asset URLs resolve under https://<owner>.github.io/<repo-name>/.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/',
  build: { outDir: 'dist', sourcemap: false },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
