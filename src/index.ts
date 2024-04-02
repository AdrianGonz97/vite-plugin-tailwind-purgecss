import { PurgeCSS } from 'purgecss';
import { defaultExtractor } from './extractors/default-extractor.js';
import { walk } from 'estree-walker';
import path from 'node:path';
import type { ResolvedConfig, Plugin } from 'vite';
import type { ComplexSafelist, StringRegExpArray, UserDefinedOptions } from 'purgecss';

type Extractor = (content: string) => string[];

type Options = Partial<UserDefinedOptions> & {
	safelist?: ComplexSafelist;
};
type PurgeOptions = Omit<Options, 'css'>;

const EXT_CSS = /\.(css)$/;
const MAX_STRING_LITERAL_LENGTH = 50_000;

export function purgeCss(purgeOptions?: PurgeOptions): Plugin {
	let viteConfig: ResolvedConfig;
	const selectors = new Set<string>();
	const standard: StringRegExpArray = [
		'*',
		'html',
		'body',
		/aria-current/,
		// fix for pseudo-class functions that begin with `:` getting purged (e.g. `:is`)
		// see: https://github.com/FullHuman/purgecss/issues/978
		/^\:[-a-z]+$/,
		...(purgeOptions?.safelist?.standard ?? []),
	];
	const extractor = (purgeOptions?.defaultExtractor as Extractor) ?? defaultExtractor();
	const moduleIds = new Set<string>();

	return {
		name: 'vite-plugin-tailwind-purgecss',
		apply: 'build',
		enforce: 'post',

		load(id) {
			if (EXT_CSS.test(id)) return;
			moduleIds.add(id);
		},

		configResolved(config) {
			viteConfig = config;
		},

		async generateBundle(options, bundle) {
			type ChunkOrAsset = (typeof bundle)[string];
			type Asset = Extract<ChunkOrAsset, { type: 'asset' }>;
			const assets: Record<string, Asset> = {};

			for (const id of moduleIds) {
				const info = this.getModuleInfo(id);
				if (info?.isIncluded !== true || info.code === null) continue;

				const ast = this.parse(info.code);

				// @ts-expect-error mismatched node types
				walk(ast, {
					enter(node, parent, key, index) {
						if (node.type === 'Literal' && typeof node.value === 'string') {
							node.value.split(/\s+/).forEach((word) => {
								if (word.length < MAX_STRING_LITERAL_LENGTH) {
									extractor(word).forEach((selector) => selectors.add(selector));
								} else selectors.add(word);
							});
						}
						if (node.type === 'Identifier') {
							selectors.add(node.name);
						}
						if (node.type === 'TemplateElement') {
							const value = node.value.cooked ?? node.value.raw;
							value.split(/\s+/).forEach((word) => {
								if (word.length < MAX_STRING_LITERAL_LENGTH) {
									extractor(word).forEach((selector) => selectors.add(selector));
								} else selectors.add(word);
							});
						}
					},
				});
			}

			for (const [fileName, chunkOrAsset] of Object.entries(bundle)) {
				if (chunkOrAsset.type === 'asset' && EXT_CSS.test(fileName)) {
					assets[fileName] = chunkOrAsset;
				}
			}

			for (const selector of selectors) {
				standard.push(selector);
			}

			// normalize the glob path to use `/`
			const htmlGlob = viteConfig.root.split(path.sep).join('/') + '/**/*.html';
			for (const [fileName, asset] of Object.entries(assets)) {
				const purgeCSSResult = await new PurgeCSS().purge({
					...purgeOptions,
					content: [htmlGlob, ...(purgeOptions?.content ?? [])],
					css: [{ raw: (asset.source as string).trim(), name: fileName }],
					safelist: {
						...purgeOptions?.safelist,
						standard,
						greedy: [/svelte-/, /data-theme/, ...(purgeOptions?.safelist?.greedy ?? [])],
					},
				});

				if (purgeCSSResult[0]) {
					// prevent the original from being written
					delete bundle[asset.fileName];

					// emit the newly purged css file
					this.emitFile({
						...asset,
						type: 'asset',
						source: purgeCSSResult[0].css,
					});
				}
			}
		},
	};
}

export default purgeCss;
