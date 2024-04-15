# vite-plugin-tailwind-purgecss

## 0.3.1

### Patch Changes

- baeec98: fix: Normalize content glob paths for Windows

## 0.3.0

### Minor Changes

- 0f75105: breaking: Updated the default purging strategy to only target Tailwind specific classes
- 0f75105: feat: Bundle size differences are now printed during build
- 0f75105: feat: Added `legacy` mode that brings back the old plugin behavior
- 0f75105: breaking: Updated plugin option types
- 0f75105: breaking: Added `tailwindcss` (v3.3.0 or higher) as a peer-dependency

## 0.2.1

### Patch Changes

- c4aeb76: chore: Upgraded to `purgecss` v6
- c4aeb76: fix: Adjusted html content glob to account for Windows

## 0.2.0

### Minor Changes

- fc84d65: feat: Added support for Vite 5

## 0.1.4

### Patch Changes

- 74b3725: fix: Decreased plugin processing time by 80%

## 0.1.3

### Patch Changes

- ef556dd: fix: Added `data-theme` to the safelist

## 0.1.2

### Patch Changes

- c9eb647: fix: Tailwind's arbitrary values are no longer erroneously removed

## 0.1.1

### Patch Changes

- 47b85eb: fix: Reduced processing time by only extracting selectors from string literals of a certain max length

## 0.1.0

### Minor Changes

- aef2c21: feat: Upgraded `purgecss` to `6.0.0-alpha.0`

## 0.0.4

### Patch Changes

- f1ba153: fix: Pseudo-class functions are no longer purged (see: https://github.com/FullHuman/purgecss/issues/978)

## 0.0.3

### Patch Changes

- b8500be: fix: Updated the name of the plugin

## 0.0.2

### Patch Changes

- cf344f3: fix: Check the values of `TemplateElement` nodes for selectors

## 0.0.1

### Patch Changes

- 5c333c3: Initial Release
