import {nonNullable} from '../lib/assert.js';
import type {CanvasLike, ContextLike} from '../lib/svg-canvas.js';

export let canvas: CanvasLike = nonNullable(
	document.querySelector<HTMLCanvasElement>('#canvas'),
);

export let context: ContextLike = nonNullable(canvas.getContext('2d'));

export async function outputToSvg() {
	const oldCanvas = canvas;
	const olContext = context;
	const svgCanvas = document.createElement('svg-canvas');
	const svgContext = nonNullable(svgCanvas.getContext('2d'));

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
