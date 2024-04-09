# vite-plugin-tailwind-purgecss

## Legacy Mode

In previous versions (`v0.2.1` and below), `vite-plugin-tailwind-purgecss` would purge _all_ unused selectors. This proved to be problematic and was beyond the scope of the project. For backwards compatibility, this feature can be brought back by enabling _legacy mode_.

## Usage

Legacy mode can be enabled through the following plugin config option:

```ts
// vite.config.ts
import { purgeCss } from 'vite-plugin-tailwind-purgecss';

const config: UserConfig = {
	plugins: [purgeCss({ legacy: true })],
};
```

### Safelisting

If selectors that shouldn't be purged are being removed, simply add them to the `safelist`.

```ts
// vite.config.ts
import { purgeCss } from 'vite-plugin-tailwind-purgecss';

const config: UserConfig = {
	plugins: [
		sveltekit(),
		purgeCss({
			safelist: {
				// any selectors that begin with "hljs-" will not be purged
				greedy: [/^hljs-/],
			},
			legacy: true,
		}),
	],
};
```

Alternatively, if you'd like to safelist selectors directly in your stylesheets, you can do so by adding special comments:

```css
/*! purgecss start ignore */

h1 {
	color: red;
}

h2 {
	color: blue;
}

/*! purgecss end ignore */
```

You can also safelist selectors directly in the declaration block as well:

```css
h3 {
	/*! purgecss ignore current */
	color: pink;
}
```

For further configuration, you can learn more [here](https://purgecss.com/configuration.html).
