/* eslint-disable @internal/no-object-literals */
import process from 'node:process';
import {defineConfig} from 'vite';
import MagicString from 'magic-string';
import {simple} from 'acorn-walk';

const ensureTrailingSlash = (url: string) =>
	url.endsWith('/') ? url : url + '/';

export default defineConfig({
	base: ensureTrailingSlash(
		process.env.RISG_BASE_URL ?? process.env.BASE_URL ?? '/',
	),
	cacheDir: 'node_modules/.cache/vite',
	build: {
		target: ['firefox103', 'chrome104'],
		outDir: 'build',
		rollupOptions: {
			input: ['index.html'],
		},
	},

	plugins: [
		{
			name: 'bigint to number',
			enforce: 'post',
			transform(code, id) {
				const url = new URL(`file://${id}`);

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
					/* eslint-enable @typescript-eslint/naming-convention */
				});

				return {
					code: s.toString(),
					map: s.generateMap(),
				};
			},
		},
	],
});
