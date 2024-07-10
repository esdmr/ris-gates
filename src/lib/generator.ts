import {nonNullable, assert} from './assert.js';
import {asBigInt, asNumber, maxBigInt, minBigInt, toBigInt} from './bigint.js';
import {Schematic} from './schematic.js';
import * as tileType from './tile-type.js';

function drawTile(
	schematic: Schematic,
	x: bigint,
	y: bigint,
	tile: tileType.QuadTreeTileType,
) {
	assert(x >= 0 && x < schematic.width);
	assert(y >= 0 && y < schematic.height);
	schematic.tiles[asNumber(y * schematic.width + x)] = tile;
}

function drawGrid(
	schematic: Schematic,
	activation: boolean[][],
	xOffset: bigint,
	yOffset: bigint,
) {
	const p = asBigInt(activation.length);
	const q = asBigInt(nonNullable(activation[0]).length);

	const activationMapped = activation.map((row, index, {length}) => {
		const base = (length - index) % 2 === 0;
		return row.map((i) => i === base).flatMap((i) => [i, !i]);
	});

	for (let y = 0n; y < p; y++) {
		// Western conjoins
		drawTile(schematic, xOffset - 1n, 2n * y + yOffset, tileType.conjoinE);

		// Grid
		for (let x = 0n; x < 2n * q; x++) {
			drawTile(
				schematic,
				2n * x + xOffset,
				2n * y + yOffset,
				tileType.negate,
			);

			drawTile(
				schematic,
				2n * x + xOffset + 1n,
				2n * y + yOffset,
				tileType.conjoinE,
			);

			drawTile(
				schematic,
				2n * x + xOffset,
				2n * y + yOffset - 1n,
				nonNullable(activationMapped[asNumber(y)])[asNumber(x)]
					? tileType.disjoinS
					: tileType.conjoinN,
			);
		}

		// Downward conjoins in grid
		for (let x = 0n; x < q; x++) {
			drawTile(
				schematic,
				4n * x + xOffset + 1n,
				2n * y + yOffset - 1n,
				tileType.conjoinS,
			);
		}
	}

	// Southern IO
	for (let x = 0n; x < q; x++) {
		drawTile(
			schematic,
			4n * x + xOffset,
			2n * p + yOffset - 1n,
			tileType.conjoinN,
		);
		drawTile(
			schematic,
			4n * x + xOffset + 2n,
			2n * p + yOffset - 1n,
			tileType.conjoinN,
		);

		drawTile(
			schematic,
			4n * x + xOffset,
			2n * p + yOffset,
			tileType.conjoinN,
		);
		drawTile(
			schematic,
			4n * x + xOffset + 1n,
			2n * p + yOffset,
			tileType.negate,
		);
		drawTile(
			schematic,
			4n * x + xOffset + 2n,
			2n * p + yOffset,
			tileType.disjoinS,
		);

		drawTile(
			schematic,
			4n * x + xOffset + 2n,
			2n * p + yOffset + 1n,
			tileType.io,
		);
	}
}

// eslint-disable-next-line max-params
function drawIoBridge(
	schematic: Schematic,
	x: bigint,
	xDir: -1n | 1n,
	yStart: bigint,
	yEnd: bigint,
	north: typeof tileType.conjoinN | typeof tileType.disjoinN,
) {
	const yMid = toBigInt((yStart + yEnd) / 2n);

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

function createEmptySchema(width: bigint, height: bigint) {
	/* eslint-disable @internal/no-object-literals */
	return new Schematic(
		width,
		height,
		Array.from<tileType.QuadTreeTileType>({
			length: asNumber(width * height),
		}).fill(tileType.empty),
	);
	/* eslint-enable @internal/no-object-literals */
}

export function generateMultiplexer(input: bigint, output: bigint) {
	assert(minBigInt(input, output) === 1n);
	const p = maxBigInt(input, output);
	const q = asBigInt(Math.ceil(Math.log2(asNumber(p))));
	const width = 4n * q + 4n;
	const height = 2n * p + 4n;
	const xOffset = input > output ? 2n : 3n;
	const yOffset = 2n;

	const schematic = createEmptySchema(width, height);

	drawGrid(
		schematic,
		// eslint-disable-next-line @internal/no-object-literals
		Array.from({length: asNumber(p)}, (_, index) =>
			index
				.toString(2)
				.padStart(asNumber(q), '0')
				.split('')
				.map((i) => i === '1'),
		),
		xOffset,
		yOffset,
	);

	// Northern IO
	for (let x = 0n; x < 2n * q; x++) {
		drawTile(schematic, 2n * x + xOffset, yOffset - 2n, tileType.io);
	}

	// Input IO
	for (let y = 0n; y < p; y++) {
		drawTile(
			schematic,
			input > output ? 0n : width - 1n,
			2n * y + yOffset,
			tileType.io,
		);
	}

	// Output IO
	drawIoBridge(
		schematic,
		input > output ? width - 2n : 1n,
		input > output ? 1n : -1n,
		yOffset,
		2n * p + yOffset - 1n,
		input > output ? tileType.conjoinN : tileType.disjoinN,
	);

	return schematic;
}

export function generateDecoder(input: bigint, output: bigint) {
	assert(output <= 2n ** input);
	const p = output;
	const q = input;
	const width = 4n * q + 3n;
	const height = 2n * p + 3n;
	const xOffset = 2n;
	const yOffset = 1n;

	const schematic = createEmptySchema(width, height);

	drawGrid(
		schematic,
		// eslint-disable-next-line @internal/no-object-literals
		Array.from({length: asNumber(p)}, (_, index) =>
			index
				.toString(2)
				.padStart(asNumber(q), '0')
				.split('')
				.map((i) => i === '1'),
		),
		xOffset,
		yOffset,
	);

	for (let y = 0n; y < p; y++) {
		// Western Negate
		drawTile(schematic, 0n, 2n * y + yOffset, tileType.negate);

		// Output IO
		drawTile(schematic, width - 1n, 2n * y + yOffset, tileType.io);
	}

	return schematic;
}

export function generateEncoder(input: bigint, output: bigint) {
	assert(input === 2n ** output);

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

	const p = asBigInt(activation.length);
	const q = input;
	const width = 4n * q + 4n;
	const height = 2n * p + 3n;
	const xOffset = 2n;
	const yOffset = 1n;

	const schematic = createEmptySchema(width, height);

	drawGrid(
		schematic,
		activation.map((i) =>
			i
				.toString(2)
				.padStart(asNumber(q), '0')
				.split('')
				.map((i) => i === '1'),
		),
		xOffset,
		yOffset,
	);

	for (let y = 0n; y < p; y++) {
		// Western Negate
		drawTile(schematic, 0n, 2n * y + yOffset, tileType.negate);
	}

	const outputParts = toBigInt(q / 2n);

	for (let i = 0n; i < output; i++) {
		drawIoBridge(
			schematic,
			width - 2n,
			1n,
			2n * (outputParts - 1n) * i + yOffset,
			2n * (outputParts - 1n) * (i + 1n) + yOffset + 1n,
			tileType.conjoinN,
		);

		if (i > 0n) {
			drawTile(
				schematic,
				width - 2n,
				2n * (outputParts - 1n) * i + yOffset,
				tileType.disjoinW,
			);
		}
	}

	drawTile(schematic, width - 2n, schematic.height - 4n, tileType.conjoinE);
	drawTile(schematic, width - 1n, schematic.height - 4n, tileType.io);

	return schematic;
}
