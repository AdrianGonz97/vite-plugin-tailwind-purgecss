import path from 'node:path';
import fs from 'node:fs';
import loadConfig from 'tailwindcss/loadConfig.js';
import resolveConfig from 'tailwindcss/resolveConfig.js';
import defaultConfig from 'tailwindcss/defaultConfig.js';
import { defaultExtractor as createDefaultExtractor } from 'tailwindcss/lib/lib/defaultExtractor.js';
import ctxPkg from 'tailwindcss/lib/lib/setupContextUtils.js';
import type { Config as TWConfig } from 'tailwindcss';
import type { ContentConfig } from 'tailwindcss/types/config.js';

const defaultConfigFiles = [
	'tailwind.config.js',
	'tailwind.config.cjs',
	'tailwind.config.mjs',
	'tailwind.config.ts',
];

function resolveDefaultConfigPath(): string | null {
	for (const configFile of defaultConfigFiles) {
		try {
			const configPath = path.resolve(configFile);
			fs.accessSync(configPath);
			return configPath;
		} catch (err) {}
	}

	return null;
}

function resolveTailwindConfigPath(configPath?: string): string | null {
	if (configPath === undefined) {
		return resolveDefaultConfigPath();
	}

	try {
		const resolvedPath = path.resolve(configPath);
		fs.accessSync(resolvedPath);
		return resolvedPath;
	} catch (err) {}

	return null;
}

export function resolveTailwindConfig(configPath?: string): TWConfig {
	const resolvedConfigPath = resolveTailwindConfigPath(configPath);
	const loadedConfig = resolvedConfigPath !== null ? loadConfig(resolvedConfigPath) : defaultConfig;
	const config = resolveConfig(loadedConfig);

	return config as TWConfig;
}

const { createContext: createTWContext } = ctxPkg;
export function getTailwindClasses(config: TWConfig) {
	const tailwindClasses = new Set<string>();

	const ctx = createTWContext(config);
	const classes = ctx.getClassList();
	for (const className of classes) {
		tailwindClasses.add(className);
	}

	return {
		classes: tailwindClasses,
		isClass: (selector: string): boolean => {
			// strips the `!` modifier and splits into chunks
			const parts = selector.replaceAll('!', '').split(config.separator!);
			const className = parts.at(-1)!;
			return tailwindClasses.has(className) || isArbitrary(className) || isColorOpacity(className);
		},
	};
}

const ARBITRARY_CLASS_REGEX = /-\[.+\]$/i;
function isArbitrary(selector: string): boolean {
	return ARBITRARY_CLASS_REGEX.test(selector);
}

const OPACITY_COLOR_CLASS_REGEX = /\/(\[.+\]|\d+)$/i;
function isColorOpacity(selector: string): boolean {
	return OPACITY_COLOR_CLASS_REGEX.test(selector);
}

export function isTailwindClass(selector: string) {
	selector.split(selector);
}

export const defaultExtractor = (tailwindConfig: TWConfig) =>
	createDefaultExtractor({ tailwindConfig });

// split the content into file paths and raw
export function getContentPaths(config: ContentConfig): string[] {
	if (Array.isArray(config)) {
		return config.filter((p): p is string => typeof p === 'string');
	}
	return config.files.filter((p): p is string => typeof p === 'string');
}
