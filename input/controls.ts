import {assert} from '../lib/assert.js';

// Cast safety: We assert afterwards.
export const showNodes =
	document.querySelector<HTMLInputElement>('#show-nodes')!;
assert(showNodes);
