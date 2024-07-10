import {assert} from './assert.js';

/**
 * Convert an integral {@link Number} into a {@link BigInt}. It is undefined
 * behavior for the number to be non-integral. Use {@link toBigInt} instead if
 * the value might be non-integral.
 *
 * Note: This function is a No-Op if BigInt-to-Number conversion is enabled. In
 * fact, calls to any function named `asBigInt` will be stripped, and only the
 * argument will remain.
 */
// eslint-disable-next-line unicorn/prefer-native-coercion-functions
export function asBigInt(value: number) {
	return BigInt(value);
}

/**
 * Convert a {@link BigInt} into an integral {@link Number}.
 *
 * Note: This function is a No-Op if BigInt-to-Number conversion is enabled. In
 * fact, calls to any function named `asNumber` will be stripped, and only the
 * argument will remain.
 */
// eslint-disable-next-line unicorn/prefer-native-coercion-functions
export function asNumber(value: bigint) {
	return Number(value);
}

/**
 * Parse a {@link String} into a decimal {@link BigInt}.
 *
 * Note: If BigInt-to-Number conversion is enabled, calls to any function named
 * `parseBigInt` will be inlined into a {@link Number.parseInt} call with a
 * radix of 10.
 */
export function parseBigInt(value: string) {
	return RISG_BIGINT ? BigInt(value) : asBigInt(Number.parseInt(value, 10));
}

/**
 * Truncate a {@link Number} into a {@link BigInt}. If given a {@link BigInt},
 * it will return it without modification.
 *
 * Note: If BigInt-to-Number conversion is enabled, calls to any function named
 * `toBigInt` will be inlined into a {@link Math.trunc} call.
 */
export function toBigInt(value: bigint | number) {
	return typeof value === 'bigint' ? value : asBigInt(Math.trunc(value));
}

/**
 * Convert a {@link Number} into a fixed-point {@link BigInt} with a given
 * precision.
 */
export function toFixedPoint(number: number, precision: bigint) {
	return toBigInt(number * 10 ** asNumber(precision));
}

/**
 * Returns the {@link Math.abs absolute value} of a {@link BigInt}.
 *
 * Note: If BigInt-to-Number conversion is enabled, calls to any function named
 * `absBigInt` will be inlined into a {@link Math.abs} call.
 */
export function absBigInt(value: bigint) {
	return value < 0n ? -value : value;
}

/**
 * Returns the {@link Math.max maximum} of two {@link BigInt}s.
 *
 * Note: If BigInt-to-Number conversion is enabled, calls to any function named
 * `maxBigInt` will be inlined into a {@link Math.max} call.
 */
export function maxBigInt(a: bigint, b: bigint) {
	return a < b ? b : a;
}

/**
 * Returns the {@link Math.min minimum} of two {@link BigInt}s.
 *
 * Note: If BigInt-to-Number conversion is enabled, calls to any function named
 * `minBigInt` will be inlined into a {@link Math.min} call.
 */
export function minBigInt(a: bigint, b: bigint) {
	return a < b ? a : b;
}

/**
 * Returns the {@link Math.sign sign} of two {@link BigInt}s.
 *
 * Note: If BigInt-to-Number conversion is enabled, calls to any function named
 * `signBigInt` will be inlined into a {@link Math.sign} call.
 */
export function signBigInt(value: bigint) {
	return value > 0n ? 1n : value < 0n ? -1n : 0n;
}

/** @see https://graphics.stanford.edu/~seander/bithacks.html#DetermineIfPowerOf2 */
export function isPowerOfTwo(value: bigint) {
	// eslint-disable-next-line no-bitwise
	return value > 0n && (value & (value - 1n)) === 0n;
}

/** @see https://golb.hplar.ch/2018/09/javascript-bigint.html */
export function roundedSqrt(value: bigint) {
	if (RISG_BIGINT) {
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

	return asBigInt(Math.round(Math.sqrt(asNumber(value))));
}
