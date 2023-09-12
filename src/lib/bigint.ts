import {assert} from './assert.js';

/** @see https://graphics.stanford.edu/~seander/bithacks.html#DetermineIfPowerOf2 */
export function isPowerOfTwo(value: bigint) {
	// eslint-disable-next-line no-bitwise
	return value > 0n && (value & (value - 1n)) === 0n;
}

/** @see https://golb.hplar.ch/2018/09/javascript-bigint.html */
export function roundedSqrt(value: bigint) {
	if (typeof value === 'bigint') {
		// This branch is only used if the bigint to number conversion is
		// disabled. Otherwise, this entire branch will be treeshaked in favor
		// of the much simpler and faster version below.

		assert(value >= 0n);
		let o = 0n;
		let x = value;
		let limit = 100;

		while (x ** 2n !== 2n && x !== o && --limit) {
			o = x;
			x = (x + value / x) / 2n;
		}

		return x;
	}

	// Cast safety: This branch is used if the bigint to number conversion
	// is enabled. Since TypeScript does not know about that, we lie to it.
	return Math.round(Math.sqrt(value)) as never;
}
