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
	define: {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		RISG_BIGINT: JSON.stringify(process.env.RISG_BIGINT ?? ''),
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
					CallExpression(n: acorn.Node) {
						// Cast safety: acorn.Node is insufficiently typed.
						if (
							(n as any).callee.type === 'Identifier' &&
							((n as any).callee.name === 'asNumber' ||
								(n as any).callee.name === 'asBigInt') &&
							(n as any).arguments.length === 1
						) {
							s.update(
								((n as any).callee as acorn.Node).start,
								((n as any).callee as acorn.Node).end,
								'',
							);
						} else if (
							(n as any).callee.type === 'Identifier' &&
							(n as any).callee.name === 'parseBigInt' &&
							(n as any).arguments.length === 1
						) {
							s.update(
								((n as any).callee as acorn.Node).start,
								((n as any).callee as acorn.Node).end,
								'Number.parseInt',
							);
							s.appendLeft(n.end - 1, ',10');
						} else if (
							(n as any).callee.type === 'Identifier' &&
							(n as any).callee.name === 'toBigInt' &&
							(n as any).arguments.length === 1
						) {
							s.update(
								((n as any).callee as acorn.Node).start,
								((n as any).callee as acorn.Node).end,
								'Math.trunc',
							);
						} else if (
							(n as any).callee.type === 'Identifier' &&
							[
								'absBigInt',
								'maxBigInt',
								'minBigInt',
								'signBigInt',
							].includes((n as any).callee.name as string)
						) {
							s.appendRight(
								((n as any).callee as acorn.Node).start,
								'Math.',
							);
							s.remove(
								((n as any).callee as acorn.Node).end - 6,
								((n as any).callee as acorn.Node).end,
							);
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
