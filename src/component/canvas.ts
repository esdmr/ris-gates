import {nonNullable} from '../lib/assert.js';
import {query, create} from '../lib/dom.js';
import {
	SvgCanvas,
	type CanvasLike,
	type ContextLike,
} from '../lib/svg-canvas.js';

export let canvas: CanvasLike = query('#canvas', HTMLCanvasElement);
export let context: ContextLike = nonNullable(canvas.getContext('2d'));

export function setup() {
	customElements.define('svg-canvas', SvgCanvas);
}

export async function outputToSvg() {
	const oldCanvas = canvas;
	const olContext = context;
	// eslint-disable-next-line @internal/no-object-literals
	const svgCanvas = create('svg-canvas', {});
	const svgContext = nonNullable(svgCanvas.getContext());

	svgCanvas.width = oldCanvas.width;
	svgCanvas.height = oldCanvas.height;
	canvas = svgCanvas;
	context = svgContext;

	return new Promise<string>((resolve) => {
		requestAnimationFrame(() => {
			resolve(svgCanvas.getText());
			canvas = oldCanvas;
			context = olContext;
		});
	});
}
