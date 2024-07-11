import process from 'node:process';
import {defineConfig, type PluginOption} from 'vite';
import MagicString from 'magic-string';
import {simple} from 'acorn-walk';
import {namedTypes} from 'ast-types';

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
					Literal(n: acorn.Node & namedTypes.Literal) {
						if ('bigint' in n) {
							s.update(n.start, n.end, String(n.bigint));
						}
					},
					Identifier(n: acorn.Node & namedTypes.Identifier) {
						if (n.name === 'BigInt') {
							s.update(n.start, n.end, 'Number');
						}
					},
					BinaryExpression(
						n: acorn.Node & namedTypes.BinaryExpression,
					) {
						if (
							(n.operator === '==' || n.operator === '===') &&
							namedTypes.UnaryExpression.check(n.left) &&
							n.left.operator === 'typeof' &&
							namedTypes.Literal.check(n.right) &&
							n.right.value === 'bigint'
						) {
							s.update(n.start, n.end, 'false');
						}
					},
					CallExpression(n: acorn.Node & namedTypes.CallExpression) {
						if (!namedTypes.Identifier.check(n.callee)) return;

						const callee = n.callee as acorn.Node &
							namedTypes.Identifier;

						if (
							(n.callee.name === 'asNumber' ||
								n.callee.name === 'asBigInt') &&
							n.arguments.length === 1
						) {
							s.update(callee.start, callee.end, '');
						} else if (
							n.callee.name === 'parseBigInt' &&
							n.arguments.length === 1
						) {
							s.update(
								callee.start,
								callee.end,
								'Number.parseInt',
							);
							s.appendLeft(n.end - 1, ', 10');
						} else if (
							n.callee.name === 'toBigInt' &&
							n.arguments.length === 1
						) {
							s.update(callee.start, callee.end, 'Math.trunc');
						} else if (
							[
								'absBigInt',
								'maxBigInt',
								'minBigInt',
								'signBigInt',
							].includes(n.callee.name)
						) {
							s.appendRight(callee.start, 'Math.');
							s.remove(callee.end - 6, callee.end);
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
