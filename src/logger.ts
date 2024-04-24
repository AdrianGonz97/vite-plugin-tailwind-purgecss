import color from 'chalk';
import path from 'node:path';
import type { ResolvedConfig } from 'vite';

export type Logger = ReturnType<typeof createLogger>;

export function createLogger(viteConfig: ResolvedConfig) {
	const PREFIX = color.cyan('[vite-plugin-tailwind-purgecss]: ');
	const logger = {
		info: (msg: string) => viteConfig.logger.info(PREFIX + msg),
		warn: (msg: string) => viteConfig.logger.warn(PREFIX + color.yellow(msg)),
		error: (msg: string) => viteConfig.logger.error(PREFIX + color.red(msg)),
		clear: () => viteConfig.logger.clearScreen('info'),
		colorFile: (filepath: string) => {
			const fp = path.parse(filepath);
			const colored = color.gray(fp.dir + '/') + fp.base;
			return colored;
		},
	};

	return logger;
}
