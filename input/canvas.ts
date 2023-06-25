import {assert} from '../lib/assert.js';

// Cast safety: We assert afterwards.
export const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
assert(canvas);

// Cast safety: We assert afterwards.
export const context = canvas.getContext('2d')!;
assert(context);
