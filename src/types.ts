import type { ComplexSafelist, Extractors } from 'purgecss';

type Extractor = (content: string) => string[];

export type PurgeOptions = {
	/**
	 * Path to your tailwind config.
	 *
	 * Provide one if your config resides anywhere outside of the root.
	 */
	tailwindConfigPath?: string;
	/**
	 * Enables `legacy` mode.
	 *
	 * Legacy mode purges everything, not just Tailwind classes. Use with caution.
	 *
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
	 *
	 * `legacy` must be set to `true` to enable.
	 */
	safelist?: ComplexSafelist;
	/** @default false */
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
	/** Outputs the purged CSS to a specified path. */
	output?: string;
	/** Ignores certain files or folders that would otherwise be scanned. */
	skippedContentGlobs?: Array<string>;
	/**
	 * Option to add custom CSS attribute selectors like `aria-selected`, `data-selected`, etc.
	 * @see https://github.com/FullHuman/purgecss/issues/588
	 */
	dynamicAttributes?: string[];
};
