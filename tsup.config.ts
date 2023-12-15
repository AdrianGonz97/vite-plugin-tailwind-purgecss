import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	splitting: true,
	sourcemap: true,
	clean: true,
	format: ['esm'],
	dts: true,
	outDir: 'dist',
	skipNodeModulesBundle: false,
	platform: 'node',
});
