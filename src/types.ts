import type { ComplexSafelist, Extractors } from 'purgecss';

type Extractor = (content: string) => string[];

export type PurgeOptions = {
	/**
	 * Path to your tailwind config. This can normally be automatically detected if the config
	 * is located in the root of the project.
	 *
	 * Provide a path if your config resides anywhere outside of the root.
	 */
	tailwindConfigPath?: string;
	/**
	 * Enables `legacy` mode. (not recommended)
	 *
	 * Legacy mode brings back the old plugin behavior (`v0.2.1` and below) where all unused CSS is purged,
	 * not just Tailwind classes. This mode is not recommended as it's too broad and can introduce
	 * unexpected bugs.
	 *
	 * **Use with caution!**
	 * @default false
	 */
	legacy?: boolean;
	/**
	 * A subset of PurgeCSS options.
	 *
	 * `legacy` must be set to `true` to enable.
	 */
	purgecss?: PurgeCSSOptions;
	/**
	 * A list of selectors that should be included in final CSS.
	 *
	 * **Note:** The safelist defined in your `tailwind.config.js` is already included.
	 *
	 * `legacy` must be set to `true` to enable.
	 */
	safelist?: ComplexSafelist;
	/**
	 * Enables `debug` mode.
	 *
	 * Incurs a large performance cost, dramatically slowing down build times.
	 * @default false
	 */
	debug?: boolean;
} & (
	| {
			legacy?: false;
			purgecss?: never;
			safelist?: never;
	  }
	| {
			legacy: true;
			safelist?: ComplexSafelist;
			purgecss?: PurgeCSSOptions;
	  }
);

type PurgeCSSOptions = {
	/**
	 * The extractor used on every file type.
	 *
	 * The default is set to Tailwind's default extractor.
	 */
	defaultExtractor?: Extractor;
	/**
	 * A list of custom extractors for specified file types.
	 *
	 * **Note:** The default extractor must be changed if you want to customize the extractor for `.js` files.
	 */
	extractors?: Array<Extractors>;
	/**
	 * Removes any unused @font-face rules.
	 * @default false
	 */
	fontFace?: boolean;
	/**
	 * Removes any unused keyframes.
	 * @default false
	 */
	keyframes?: boolean;
	/**
	 * Removes any unused CSS variables.
	 * @default false
	 */
	variables?: boolean;
	/**
	 * Option to add custom CSS attribute selectors like `aria-selected`, `data-selected`, etc.
	 * @see https://github.com/FullHuman/purgecss/issues/588
	 */
	dynamicAttributes?: string[];
};
