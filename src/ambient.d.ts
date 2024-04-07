declare module 'tailwindcss/lib/lib/defaultExtractor.js' {
	function defaultExtractor(context: {
		tailwindConfig: import('tailwindcss').Config;
	}): (content: string) => string[];
}

declare module 'tailwindcss/lib/lib/setupContextUtils.js' {
	function createContext(config: import('tailwindcss').Config): { getClassList: () => string[] };
}
