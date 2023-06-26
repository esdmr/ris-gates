/* eslint-disable @internal/explained-casts */
import {assert} from '../lib/assert.js';

export const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
assert(canvas);

export const context = canvas.getContext('2d')!;
assert(context);
