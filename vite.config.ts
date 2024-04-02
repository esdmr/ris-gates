import process from 'node:process';
import {defineConfig, type PluginOption} from 'vite';
import MagicString from 'magic-string';
import {simple} from 'acorn-walk';

function ensureTrailingSlash(url: string) {
	return url.endsWith('/') ? url : url + '/';
}

export default defineConfig(({mode}) => ({
	base: ensureTrailingSlash(
		process.env.RISG_BASE_URL ?? process.env.BASE_URL ?? '/',
	),
	cacheDir: 'node_modules/.cache/vite',
	build: {
		target: ['firefox103', 'chrome104'],
		outDir: 'build',
		rollupOptions: {
			input: [
				'index.html',
				process.env.RISG_CLI ? 'src/cli.ts' : '',
			].filter(Boolean),
		},
		modulePreload: {
			polyfill: false,
		},
		sourcemap: mode !== 'production',
		minify: mode === 'production',
	},
	plugins: [
		Boolean(process.env.RISG_CLI) && {
			name: 'cli',
			enforce: 'pre',
			resolveId(source, _importer, _options) {
				if (source.startsWith('node:')) {
					return {
						external: true,
						id: source,
					};
				}

				return null;
			},
		},
		!process.env.RISG_BIGINT && {
			name: 'bigint to number',
			enforce: 'post',
			transform(code, id) {
				let url;

				try {
					url = new URL(`file://${id}`);
				} catch {
					return;
				}

				if (
					url.pathname.endsWith('.css') ||
					url.pathname.includes('node_modules')
				)
					return null;

				const ast = this.parse(code);
				const s = new MagicString(code);

				simple(ast, {
					/* eslint-disable @typescript-eslint/naming-convention */
					Literal(n: acorn.Node) {
						if ('bigint' in n) {
							// Cast safety: acorn.Node is insufficiently typed.
							s.update(n.start, n.end, n.bigint as string);
						}
					},
					Identifier(n: acorn.Node) {
						// Cast safety: acorn.Node is insufficiently typed.
						if ((n as any).name === 'BigInt') {
							s.update(n.start, n.end, 'Number');
						}
					},
					BinaryExpression(n: acorn.Node) {
						// Cast safety: acorn.Node is insufficiently typed.
						if (
							((n as any).operator === '==' ||
								(n as any).operator === '===') &&
							(n as any).left.type === 'UnaryExpression' &&
							(n as any).left.operator === 'typeof' &&
							(n as any).right.type === 'Literal' &&
							(n as any).right.value === 'bigint'
						) {
							s.update(n.start, n.end, 'false');
						}
					},
					/* eslint-enable @typescript-eslint/naming-convention */
				});

				return {
					code: s.toString(),
					map: s.generateMap(),
				};
			},
		},
	] satisfies PluginOption,
}));
