import {nonNullable, assert} from './assert.js';
import {Schematic} from './schematic.js';
import * as tileType from './tile-type.js';

function drawTile(
	schematic: Schematic,
	x: number,
	y: number,
	tile: tileType.QuadTreeTileType,
) {
	assert(x >= 0 && x < schematic.width);
	assert(y >= 0 && y < schematic.height);
	schematic.tiles[y * schematic.width + x] = tile;
}

function drawGrid(
	schematic: Schematic,
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
		drawTile(schematic, xOffset - 1, 2 * y + yOffset, tileType.conjoinE);

		// Grid
		for (let x = 0; x < 2 * q; x++) {
			drawTile(
				schematic,
				2 * x + xOffset,
				2 * y + yOffset,
				tileType.negate,
			);

			drawTile(
				schematic,
				2 * x + xOffset + 1,
				2 * y + yOffset,
				tileType.conjoinE,
			);

			drawTile(
				schematic,
				2 * x + xOffset,
				2 * y + yOffset - 1,
				nonNullable(activationMapped[y])[x]
					? tileType.disjoinS
					: tileType.conjoinN,
			);
		}

		// Downward conjoins in grid
		for (let x = 0; x < q; x++) {
			drawTile(
				schematic,
				4 * x + xOffset + 1,
				2 * y + yOffset - 1,
				tileType.conjoinS,
			);
		}
	}

	// Southern IO
	for (let x = 0; x < q; x++) {
		drawTile(
			schematic,
			4 * x + xOffset,
			2 * p + yOffset - 1,
			tileType.conjoinN,
		);
		drawTile(
			schematic,
			4 * x + xOffset + 2,
			2 * p + yOffset - 1,
			tileType.conjoinN,
		);

		drawTile(
			schematic,
			4 * x + xOffset,
			2 * p + yOffset,
			tileType.conjoinN,
		);
		drawTile(
			schematic,
			4 * x + xOffset + 1,
			2 * p + yOffset,
			tileType.negate,
		);
		drawTile(
			schematic,
			4 * x + xOffset + 2,
			2 * p + yOffset,
			tileType.disjoinS,
		);

		drawTile(
			schematic,
			4 * x + xOffset + 2,
			2 * p + yOffset + 1,
			tileType.io,
		);
	}
}

// eslint-disable-next-line max-params
function drawIoBridge(
	schematic: Schematic,
	x: number,
	xDir: -1 | 1,
	yStart: number,
	yEnd: number,
	north: typeof tileType.conjoinN | typeof tileType.disjoinN,
) {
	const yMid = Math.trunc((yStart + yEnd) / 2);

	for (let y = yStart; y < yEnd; y++) {
		// Cast safety: (north + 0) is north and (north + 2) is south.
		drawTile(
			schematic,
			x,
			y,
			(north + (y < yMid ? 2 : 0)) as tileType.QuadTreeTileType,
		);
	}

	// Cast safety: (north + 3) is west and (north + 1) is east.
	drawTile(
		schematic,
		x,
		yMid,
		(north + (xDir < 0 ? 3 : 1)) as tileType.QuadTreeTileType,
	);

	drawTile(schematic, x + xDir, yMid, tileType.io);
}

function createEmptySchema(width: number, height: number) {
	/* eslint-disable @internal/no-object-literals */
	return new Schematic(
		width,
		height,
		Array.from<tileType.QuadTreeTileType>({length: width * height}).fill(
			tileType.empty,
		),
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

	const schematic = createEmptySchema(width, height);

	drawGrid(
		schematic,
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
		drawTile(schematic, 2 * x + xOffset, yOffset - 2, tileType.io);
	}

	// Input IO
	for (let y = 0; y < p; y++) {
		drawTile(
			schematic,
			input > output ? 0 : width - 1,
			2 * y + yOffset,
			tileType.io,
		);
	}

	// Output IO
	drawIoBridge(
		schematic,
		input > output ? width - 2 : 1,
		input > output ? 1 : -1,
		yOffset,
		2 * p + yOffset - 1,
		input > output ? tileType.conjoinN : tileType.disjoinN,
	);

	return schematic;
}

export function generateDecoder(input: number, output: number) {
	assert(output <= 2 ** input);
	const p = output;
	const q = input;
	const width = 4 * q + 3;
	const height = 2 * p + 3;
	const xOffset = 2;
	const yOffset = 1;

	const schematic = createEmptySchema(width, height);

	drawGrid(
		schematic,
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
		drawTile(schematic, 0, 2 * y + yOffset, tileType.negate);

		// Output IO
		drawTile(schematic, width - 1, 2 * y + yOffset, tileType.io);
	}

	return schematic;
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

	const schematic = createEmptySchema(width, height);

	drawGrid(
		schematic,
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
		drawTile(schematic, 0, 2 * y + yOffset, tileType.negate);
	}

	const outputParts = q / 2;

	for (let i = 0; i < output; i++) {
		drawIoBridge(
			schematic,
			width - 2,
			1,
			2 * (outputParts - 1) * i + yOffset,
			2 * (outputParts - 1) * (i + 1) + yOffset + 1,
			tileType.conjoinN,
		);

		if (i > 0) {
			drawTile(
				schematic,
				width - 2,
				2 * (outputParts - 1) * i + yOffset,
				tileType.disjoinW,
			);
		}
	}

	drawTile(schematic, width - 2, schematic.height - 4, tileType.conjoinE);
	drawTile(schematic, width - 1, schematic.height - 4, tileType.io);

	return schematic;
}
