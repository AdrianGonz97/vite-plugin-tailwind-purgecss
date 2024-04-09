# vite-plugin-tailwind-purgecss

[![npm version](https://img.shields.io/npm/v/vite-plugin-tailwind-purgecss?logo=npm&color=cb3837)](https://www.npmjs.com/package/vite-plugin-tailwind-purgecss)
[![license](https://img.shields.io/badge/license-MIT-%23bada55)](https://github.com/AdrianGonz97/vite-plugin-tailwind-purgecss/blob/main/LICENSE)

> [!IMPORTANT]
> As of [`v0.3.0`](https://github.com/AdrianGonz97/vite-plugin-tailwind-purgecss/pull/27), `vite-plugin-tailwind-purgecss` no longer purges **all** unused CSS. Instead, it takes a more conservative and focused approach, only purging unused **tailwindcss classes**. The previous purging strategy introduced too many bugs and reached far outside of its intended scope. If you wish to reenable the old behavior, see [legacy mode](/legacy-mode.md).

A simple vite plugin that purges excess Tailwind CSS classes. This plugin should be used in combination with [TailwindCSS](https://tailwindcss.com/) and a Tailwind UI component library, such as [Skeleton](https://skeleton.dev), [Flowbite](https://flowbite.com/) or even [shadcn-ui](https://ui.shadcn.com/) (and it's [many ports](https://shadcn-svelte.com/)).

## Motivation

> [!NOTE]
> This plugin will no longer be necessary after the release of [Tailwind v4](https://tailwindcss.com/blog/tailwindcss-v4-alpha) as they are introducing a new [Vite plugin](https://tailwindcss.com/blog/tailwindcss-v4-alpha#zero-configuration-content-detection) that will detect and generate the tailwind classes based on the module graph! As such, this plugin will only support Tailwind v3.

Tailwind UI component libraries are fantastic and a joy to work with, but they come with an important caveat. The downside to them is that all of the Tailwind classes that are used in **their provided components** are _always_ generated, **even if you don't import and use any of them**. This leads to a larger than necessary CSS bundle.

This is a limitation of how Tailwind works with the config's `content` field. Tailwind searches through all of the files that are specified in `content`, uses a regex to find any possible selectors, and generates their respective classes. There's no treeshaking and no purging involved.

## How it works

Ideally, we only want to keep the tailwind classes that are being used in your project. We accomplish this by analyzing the files in the module graph and extracting out any of their possible selectors. From there, we pass along the selectors to PurgeCSS for final processing.

Using `vite-plugin-tailwind-purgecss` with [Skeleton](https://skeleton.dev), we're able to reduce the CSS bundle size of Skeleton's [Barebones Template](https://github.com/skeletonlabs/skeleton-template-bare) from:

```
105.62 kB │ gzip: 14.36 kB
```

down to:

```
16.33 kB │ gzip:  4.08 kB
```

## Usage

### Installation

```bash
npm add -D vite-plugin-tailwind-purgecss
```

### Add to Vite

```ts
// vite.config.ts
import { purgeCss } from 'vite-plugin-tailwind-purgecss';

const config: UserConfig = {
	plugins: [sveltekit(), purgeCss()],
};
```

...and you're all set!

<details>
	<summary><h2>Plugin Config Options</h2></summary>

```ts
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
};
```

</details>

## FAQ

### Why not use `postcss-purgecss` or `rollup-plugin-purgecss`?

PurgeCSS provides a suite of plugins that do a well enough job for _most_ projects. However, plugins such as [postcss-purgecss](https://github.com/FullHuman/purgecss/tree/main/packages/postcss-purgecss) and [rollup-plugin-purgecss](https://github.com/FullHuman/purgecss/tree/main/packages/rollup-plugin-purgecss) take a rather naive approach to selector extraction. Similar to how Tailwind generates its classes, they _only_ analyze the files that are passed to them through their `content` fields, which means that if you pass an entire UI library to it, none of the selectors that are **unused** in _your project_ will be properly purged.
