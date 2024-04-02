import {nonNullable, assert} from './assert.js';
import {Schematic} from './schematic.js';
import * as tileType from './tile-type.js';

function drawGrid(
	array: tileType.QuadTreeTileType[][],
	activation: boolean[][],
	xOffset: number,
	yOffset: number,
) {
	const p = activation.length;
	const q = nonNullable(activation[0]).length;

	const activationMapped = activation.map((row, index, {length}) => {
		const base = (length - index) % 2 === 0;
		return row.map((i) => i === base).flatMap((i) => [i, !i]);
	});

	for (let y = 0; y < p; y++) {
		// Western conjoins
		nonNullable(array[2 * y + yOffset])[xOffset - 1] = tileType.conjoinE;

		// Grid
		for (let x = 0; x < 2 * q; x++) {
			nonNullable(array[2 * y + yOffset])[2 * x + xOffset] =
				tileType.negate;

			nonNullable(array[2 * y + yOffset])[2 * x + xOffset + 1] =
				tileType.conjoinE;

			nonNullable(array[2 * y + yOffset - 1])[2 * x + xOffset] =
				nonNullable(activationMapped[y])[x]
					? tileType.disjoinS
					: tileType.conjoinN;
		}

		// Downward conjoins in grid
		for (let x = 0; x < q; x++) {
			nonNullable(array[2 * y + yOffset - 1])[4 * x + xOffset + 1] =
				tileType.conjoinS;
		}
	}

	// Southern IO
	for (let x = 0; x < q; x++) {
		nonNullable(array[2 * p + yOffset - 1])[4 * x + xOffset] =
			tileType.conjoinN;
		nonNullable(array[2 * p + yOffset - 1])[4 * x + xOffset + 2] =
			tileType.conjoinN;

		nonNullable(array[2 * p + yOffset])[4 * x + xOffset] =
			tileType.conjoinN;
		nonNullable(array[2 * p + yOffset])[4 * x + xOffset + 1] =
			tileType.negate;
		nonNullable(array[2 * p + yOffset])[4 * x + xOffset + 2] =
			tileType.disjoinS;

		nonNullable(array[2 * p + yOffset + 1])[4 * x + xOffset + 2] =
			tileType.io;
	}
}

// eslint-disable-next-line max-params
function drawIoBridge(
	array: tileType.QuadTreeTileType[][],
	x: number,
	xDir: -1 | 1,
	yStart: number,
	yEnd: number,
	north: typeof tileType.conjoinN | typeof tileType.disjoinN,
) {
	const yMid = Math.trunc((yStart + yEnd) / 2);

	for (let y = yStart; y < yEnd; y++) {
		// Cast safety: (north + 0) is north and (north + 2) is south.
		nonNullable(array[y])[x] = (north +
			(y < yMid ? 2 : 0)) as tileType.QuadTreeTileType;
	}

	// Cast safety: (north + 3) is west and (north + 1) is east.
	nonNullable(array[yMid])[x] = (north +
		(xDir < 0 ? 3 : 1)) as tileType.QuadTreeTileType;

	nonNullable(array[yMid])[x + xDir] = tileType.io;
}

function createArray2D<T>(width: number, height: number, value: T) {
	/* eslint-disable @internal/no-object-literals */
	return Array.from(
		{
			length: height,
		},
		() => Array.from<T>({length: width}).fill(value),
	);
	/* eslint-enable @internal/no-object-literals */
}

export function generateMultiplexer(input: number, output: number) {
	assert(Math.min(input, output) === 1);
	const p = Math.max(input, output);
	const q = Math.ceil(Math.log2(p));
	const width = 4 * q + 4;
	const height = 2 * p + 4;
	const xOffset = input > output ? 2 : 3;
	const yOffset = 2;

	const array = createArray2D<tileType.QuadTreeTileType>(
		width,
		height,
		tileType.empty,
	);

	drawGrid(
		array,
		// eslint-disable-next-line @internal/no-object-literals
		Array.from({length: p}, (_, index) =>
			index
				.toString(2)
				.padStart(q, '0')
				.split('')
				.map((i) => i === '1'),
		),
		xOffset,
		yOffset,
	);

	// Northern IO
	for (let x = 0; x < 2 * q; x++) {
		nonNullable(array[yOffset - 2])[2 * x + xOffset] = tileType.io;
	}

	// Input IO
	for (let y = 0; y < p; y++) {
		nonNullable(array[2 * y + yOffset])[input > output ? 0 : width - 1] =
			tileType.io;
	}

	// Output IO
	drawIoBridge(
		array,
		input > output ? width - 2 : 1,
		input > output ? 1 : -1,
		yOffset,
		2 * p + yOffset - 1,
		input > output ? tileType.conjoinN : tileType.disjoinN,
	);

	return new Schematic(width, height, array.flat());
}

export function generateDecoder(input: number, output: number) {
	assert(output <= 2 ** input);
	const p = output;
	const q = input;
	const width = 4 * q + 3;
	const height = 2 * p + 3;
	const xOffset = 2;
	const yOffset = 1;

	const array = createArray2D<tileType.QuadTreeTileType>(
		width,
		height,
		tileType.empty,
	);

	drawGrid(
		array,
		// eslint-disable-next-line @internal/no-object-literals
		Array.from({length: p}, (_, index) =>
			index
				.toString(2)
				.padStart(q, '0')
				.split('')
				.map((i) => i === '1'),
		),
		xOffset,
		yOffset,
	);

	for (let y = 0; y < p; y++) {
		// Western Negate
		nonNullable(array[2 * y + yOffset])[0] = tileType.negate;

		// Output IO
		nonNullable(array[2 * y + yOffset])[width - 1] = tileType.io;
	}

	return new Schematic(width, height, array.flat());
}

export function generateEncoder(input: number, output: number) {
	assert(input === 2 ** output);

	const activation: bigint[] = [];

	for (
		let i = 0n, shared: bigint | undefined, last: bigint | undefined;
		i < output;
		i++, shared = last
	) {
		for (let j = 0n; j < input; j++) {
			// eslint-disable-next-line no-bitwise
			if ((j & (1n << i)) === 0n || j === shared) continue;
			// eslint-disable-next-line no-bitwise
			activation.push(1n << j);
			last = j;
		}
	}

	activation.reverse();
	activation.push(0n);

	const p = activation.length;
	const q = input;
	const width = 4 * q + 4;
	const height = 2 * p + 3;
	const xOffset = 2;
	const yOffset = 1;

	const array = createArray2D<tileType.QuadTreeTileType>(
		width,
		height,
		tileType.empty,
	);

	drawGrid(
		array,
		activation.map((i) =>
			i
				.toString(2)
				.padStart(q, '0')
				.split('')
				.map((i) => i === '1'),
		),
		xOffset,
		yOffset,
	);

	for (let y = 0; y < p; y++) {
		// Western Negate
		nonNullable(array[2 * y + yOffset])[0] = tileType.negate;
	}

	const outputParts = q / 2;

	for (let i = 0; i < output; i++) {
		drawIoBridge(
			array,
			width - 2,
			1,
			2 * (outputParts - 1) * i + yOffset,
			2 * (outputParts - 1) * (i + 1) + yOffset + 1,
			tileType.conjoinN,
		);

		if (i > 0) {
			nonNullable(array[2 * (outputParts - 1) * i + yOffset])[width - 2] =
				tileType.disjoinW;
		}
	}

	nonNullable(array.at(-4))[width - 2] = tileType.conjoinE;
	nonNullable(array.at(-4))[width - 1] = tileType.io;

	return new Schematic(width, height, array.flat());
}
