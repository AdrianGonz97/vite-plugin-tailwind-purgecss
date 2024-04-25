import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import color from 'chalk';
import * as css from 'css-tree';
import htmlExtractor from 'purgecss-from-html';
import { normalizePath, type ResolvedConfig, type Plugin } from 'vite';
import { PurgeCSS, mergeExtractorSelectors, standardizeSafelist } from 'purgecss';
import {
	resolveTailwindConfig,
	defaultExtractor,
	getContentPaths,
	getTailwindClasses,
	standardizeTWSafelist,
} from './tailwind.js';
import { createLogger, type Logger } from './logger.js';
import { getDefaultPurgeOptions } from './purgecss-options.js';
import type { ExtractorResultDetailed } from 'purgecss';
import type { PurgeOptions } from './types.js';

const EXT_CSS = /\.(css)$/;
// cache
const contentFiles = new Set<string>();
const htmlFiles: string[] = [];

export function purgeCss(purgeOptions?: PurgeOptions): Plugin {
	const DEBUG = purgeOptions?.debug ?? false;
	const LEGACY = purgeOptions?.legacy ?? false;

	let log: Logger;
	let viteConfig: ResolvedConfig;

	const tailwindConfig = resolveTailwindConfig(purgeOptions?.tailwindConfigPath);
	const tw = getTailwindClasses(tailwindConfig);
	const extractor = purgeOptions?.purgecss?.defaultExtractor ?? defaultExtractor(tailwindConfig);

	// safelist from the tailwind config
	const twSafelist = standardizeTWSafelist(tailwindConfig);
	const safelist = {
		...purgeOptions?.safelist,
		standard: [
			// fix for pseudo-class functions that begin with `:` getting purged (e.g. `:is`)
			// see: https://github.com/FullHuman/purgecss/issues/978
			/^\:[-a-z]+$/,
			...(purgeOptions?.safelist?.standard ?? []),
			...twSafelist,
		],
	};

	const moduleIds = new Set<string>();

	return {
		name: 'vite-plugin-tailwind-purgecss',
		apply: 'build',
		enforce: 'post',

		configResolved(config) {
			viteConfig = config;
			log = createLogger(viteConfig);

			// if the content files haven't been cached
			if (contentFiles.size === 0) {
				const contentGlobs = getContentPaths(tailwindConfig.content).map((p) => normalizePath(p));
				for (const file of fg.globSync(contentGlobs, { cwd: viteConfig.root, absolute: true })) {
					if (file.endsWith('.html')) htmlFiles.push(file);
					contentFiles.add(file);
				}
			}
		},

		load(id) {
			if (!contentFiles.has(id)) return;
			// module is included in tailwind's `content` field
			moduleIds.add(id);
		},

		async generateBundle(options, bundle) {
			type ChunkOrAsset = (typeof bundle)[string];
			type Asset = Extract<ChunkOrAsset, { type: 'asset' }>;
			const includedModules: Array<{ raw: string; extension: string }> = [];
			const includedAssets: Array<{ raw: string; name: string }> = [];
			const extensions = new Set<string>();

			const savedTWClasses = new Set<string>();
			const generatedTWClasses = new Set<string>();

			log.clear();
			if (DEBUG) log.info(`${color.greenBright('DEBUG mode activated')}.`);
			if (LEGACY) {
				log.info(`${color.yellowBright('LEGACY mode activated')}. Purging all unused CSS...`);
			} else {
				log.info('Purging unused tailwindcss styles...');
			}

			const purgecss = new PurgeCSS();
			purgecss.options = {
				...getDefaultPurgeOptions(),
				defaultExtractor: extractor,
				safelist: standardizeSafelist(safelist),
				rejected: DEBUG,
				rejectedCss: DEBUG,
			};

			// a list of selectors found in the original stylesheets
			const baseSelectors: ExtractorResultDetailed = {
				attributes: { names: [], values: [] },
				classes: [],
				ids: [],
				tags: [],
				undetermined: [],
			};
			// extracts all selectors from the stylesheet
			for (const [filename, chunkOrAsset] of Object.entries(bundle)) {
				if (chunkOrAsset.type === 'asset' && EXT_CSS.test(filename)) {
					const source = String(chunkOrAsset.source);
					includedAssets.push({ raw: source, name: filename });

					// skip CSS parsing if we're in legacy mode
					if (LEGACY) continue;

					const ast = css.parse(source);
					css.walk(ast, {
						enter(node: css.CssNode) {
							// e.g. `[name="value"] { }`
							if (node.type === 'AttributeSelector') {
								// attributes always have a name
								baseSelectors.attributes.names.push(node.name.name);

								if (node.value === null) return;
								if (node.value.type === 'Identifier') {
									baseSelectors.attributes.values.push(node.value.name);
								} else if (node.value.type === 'String') {
									baseSelectors.attributes.values.push(node.value.value);
								}
							}
							// e.g. `#name { }`
							if (node.type === 'IdSelector') {
								baseSelectors.ids.push(node.name);
							}
							// e.g. `body { }`
							if (node.type === 'TypeSelector') {
								baseSelectors.tags.push(node.name);
							}
							// e.g. `.name { }`
							if (node.type === 'ClassSelector') {
								const escapedCN = unescapeCSS(node.name);
								baseSelectors.classes.push(escapedCN);
								if (tw.isClass(escapedCN)) {
									generatedTWClasses.add(escapedCN);
								}
							}
						},
					});
				}
			}

			for (const id of moduleIds) {
				// check if the module is included in the bundle
				const info = this.getModuleInfo(id);
				if (info?.isIncluded !== true || info.code === null) continue;

				// compiled JS code
				const source = fs.readFileSync(id, { encoding: 'utf8' });
				includedModules.push({ raw: source, extension: 'tw' }, { raw: info.code, extension: 'tw' });

				if (LEGACY) {
					// plucks out the `.` (e.g. `.html` -> `html`)
					const extension = path.parse(id).ext.slice(1);
					extensions.add(extension);
					// source code
					includedModules.push({ raw: source, extension });
				}
			}

			// not TW classes, but are possibly a selector (used for legacy mode)
			const possibleSelectors = new Set<string>();
			for (const mod of includedModules) {
				if (mod.extension !== 'tw') continue;

				for (const selector of extractor(mod.raw)) {
					if (generatedTWClasses.delete(selector)) {
						savedTWClasses.add(selector);
					} else {
						possibleSelectors.add(selector);
					}
				}
			}

			const htmlSelectors = await purgecss.extractSelectorsFromFiles(htmlFiles, [
				// @ts-expect-error extractor types aren't matching for some reason
				{ extractor: htmlExtractor, extensions: ['html'] },
			]);

			// @ts-expect-error `classes` is private, but we need it
			htmlSelectors.classes.forEach((cn) => generatedTWClasses.delete(cn));

			// the remaining classes in `generatedTWClasses` are _unused_,
			// so we'll add it to the blocklist to forcefully purge them
			purgecss.options.blocklist.push(...generatedTWClasses, ...(tailwindConfig.blocklist ?? []));
			if (LEGACY) purgecss.options.safelist.standard.push(...possibleSelectors);

			// excludes `js` files as they are handled separately above
			extensions.delete('tw');
			const moduleSelectors = await purgecss.extractSelectorsFromString(includedModules, [
				{ extractor, extensions: Array.from(extensions) },
				...(purgeOptions?.purgecss?.extractors ?? []),
			]);

			const mergedSelectors = mergeExtractorSelectors(
				htmlSelectors,
				moduleSelectors,
				baseSelectors
			);

			// purge the stylesheets
			const purgeResults = await purgecss.getPurgedCSS(includedAssets, mergedSelectors);

			if (DEBUG) {
				console.dir(
					{
						possible_selectors: mergedSelectors,
						tailwind_classes_to_remove: generatedTWClasses,
						tailwind_classes_to_keep: savedTWClasses,
						purgecss_results: purgeResults,
					},
					{ maxArrayLength: Infinity, maxStringLength: Infinity, depth: Infinity }
				);
			}

			const stats = [];
			for (const result of purgeResults) {
				const filename = result.file!;
				const asset = bundle[filename] as Asset;

				// compute size differences
				const originalFileSize = new Blob([asset.source]).size / 1000;
				const finalFileSize = new Blob([result.css]).size / 1000;
				const stat = {
					filename: log.colorFile(filename),
					original: originalFileSize.toFixed(2),
					final: finalFileSize.toFixed(2),
				};
				stats.push(stat);

				// overwrite the contents of the stylesheet
				asset.source = result.css;
			}

			// print savings
			log.info(`Calculating bundle size savings: ${color.gray(`(not minified)`)}`);
			const finalSizes = stats.map((stat) => stat.final.length);
			const originalSizes = stats.map((stat) => stat.original.length);
			const nameSizes = stats.map((stat) => stat.filename.length);
			// padding
			const namePadding = Math.max(...nameSizes);
			const finalPadding = Math.max(...finalSizes);
			const originalPadding = Math.max(...originalSizes);
			for (const { filename, final, original } of stats) {
				const fp = log.colorFile(filename).padEnd(namePadding + 25);
				const og = original.padStart(originalPadding) + ' kB';
				// color the result if the size changed
				const changed = original !== final;
				const result = changed
					? color.green(final.padStart(finalPadding) + ' kB')
					: final.padStart(finalPadding) + ' kB';
				const sizes = color.bold.gray(`${og}  ->  ${result}`);
				// log results
				viteConfig.logger.info(fp + sizes);
			}
			viteConfig.logger.info('\n');
		},
	};
}

function unescapeCSS(str: string, options = { slashZero: true }) {
	const string = options?.slashZero ? str.replaceAll('�', '\0') : str;
	return string.replaceAll(/\\([\dA-Fa-f]{1,6}[\t\n\f\r ]?|[\S\s])/g, (match) => {
		return match.length > 2
			? String.fromCodePoint(Number.parseInt(match.slice(1).trim(), 16))
			: match[1];
	});
}

export default purgeCss;
export type { PurgeOptions };
