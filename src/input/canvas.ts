import {nonNullable} from '../lib/assert.js';

export const canvas = nonNullable(
	document.querySelector<HTMLCanvasElement>('#canvas'),
);

export const context = nonNullable(canvas.getContext('2d'));
