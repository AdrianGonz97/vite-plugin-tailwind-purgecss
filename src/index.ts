import { PurgeCSS } from 'purgecss';
import { defaultExtractor } from './extractors/default-extractor';
import { walk } from 'estree-walker';
import { join } from 'path';
import type { ResolvedConfig, Plugin } from 'vite';
import type { ComplexSafelist, StringRegExpArray, UserDefinedOptions } from 'purgecss';

type Extractor = (content: string) => string[];

type Options = Partial<UserDefinedOptions> & {
	safelist?: ComplexSafelist;
};
type PurgeOptions = Omit<Options, 'css'>;

const EXT_CSS = /\.(css)$/;

export function purgeCss(purgeOptions?: PurgeOptions): Plugin {
	let viteConfig: ResolvedConfig;
	const selectors = new Set<string>();
	const standard: StringRegExpArray = [
		'*',
		'html',
		'body',
		/aria-current/,
		/svelte-/,
		...(purgeOptions?.safelist?.standard ?? []),
	];
	const extractor = (purgeOptions?.defaultExtractor as Extractor) ?? defaultExtractor();
	const moduleIds = new Set<string>();

	return {
		name: 'vite-plugin-svelte-purgecss',
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
							extractor(node.value).forEach((selector) => selectors.add(selector));
						}
						if (node.type === 'Identifier') {
							extractor(node.name).forEach((selector) => selectors.add(selector));
						}
						if (node.type === 'TemplateElement') {
							extractor(node.value.cooked ?? node.value.raw).forEach((selector) =>
								selectors.add(selector)
							);
						}
					},
				});
			}

			for (const [fileName, chunkOrAsset] of Object.entries(bundle)) {
				if (chunkOrAsset.type === 'asset' && EXT_CSS.test(fileName)) {
					assets[fileName] = chunkOrAsset;
				}
			}

			const selectorsArr = Array.from(selectors);

			for (const [fileName, asset] of Object.entries(assets)) {
				const purgeCSSResult = await new PurgeCSS().purge({
					...purgeOptions,
					content: [join(viteConfig.root, '**/*.html'), ...(purgeOptions?.content ?? [])],
					css: [{ raw: (asset.source as string).trim(), name: fileName }],
					keyframes: true,
					fontFace: true,
					rejected: true,
					rejectedCss: true,
					variables: true,
					safelist: {
						...purgeOptions?.safelist,
						standard: [...standard, ...selectorsArr],
						greedy: [/svelte-/, ...(purgeOptions?.safelist?.greedy ?? [])],
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
