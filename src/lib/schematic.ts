import {assertObject, assertArray, assert} from './assert.js';
import {asBigInt, asNumber, toBigInt} from './bigint.js';
import {Point} from './point.js';
import * as tileType from './tile-type.js';
import {currentSaveVersion} from './tree.js';

export class Schematic {
	static from(json: unknown) {
		assertObject(json);

		const {version = [1, 0]} = json;

		assertArray(version);
		assert(
			version[0] === currentSaveVersion[0] &&
				typeof version[1] === 'number' &&
				version[1] <= currentSaveVersion[1],
		);

		const {width, tiles} = json;
		assert(typeof width === 'number' && Number.isSafeInteger(width));
		assertArray(tiles);

		const realWidth = asBigInt(width);
		const realLength = asBigInt(tiles.length);
		const realHeight = toBigInt(realLength / realWidth);

		assert(realWidth <= realLength && realLength % realWidth === 0n);

		assert(
			tiles.every((i) =>
				// Cast safety: Array.includes is too narrowly typed.
				tileType.quadTreeTileType.includes(
					i as tileType.QuadTreeTileType,
				),
			),
		);

		// Cast safety: Asserted above.
		return new Schematic(
			realWidth,
			realHeight,
			tiles as tileType.QuadTreeTileType[],
		);
	}

	// Note: These are intentionally not serialized.
	rotation = 0;
	horizontalReflection = false;
	verticalReflection = false;

	get realWidth() {
		return this.rotation === 0 || this.rotation === 0.5
			? this.width
			: this.height;
	}

	get realHeight() {
		return this.rotation === 0 || this.rotation === 0.5
			? this.height
			: this.width;
	}

	constructor(
		readonly width: bigint,
		readonly height: bigint,
		readonly tiles: tileType.QuadTreeTileType[],
	) {
		// `width` and `height` are lengths, so they should not be negative.
		// Zero length schematics are confusing, so those are not allowed
		// either.
		assert(width > 0n);
		assert(height > 0n);

		// Length of arrays are limited to 32 bits.
		assert(width * height < 0x1_00_00_00_00n);
	}

	transformPoint(x: bigint, y: bigint, topLeft: Point) {
		let xMain = 0n;
		let yMain = 0n;
		let xCross = 0n;
		let yCross = 0n;
		let xOffset = 0n;
		let yOffset = 0n;

		switch (this.rotation) {
			case 0: {
				xMain = 1n;
				yCross = 1n;
				break;
			}

			case 0.25: {
				yMain = 1n;
				xCross = -1n;
				xOffset = this.width - 1n;
				break;
			}

			case 0.5: {
				xMain = -1n;
				yCross = -1n;
				xOffset = this.width - 1n;
				yOffset = this.height - 1n;
				break;
			}

			case 0.75: {
				yMain = -1n;
				xCross = 1n;
				yOffset = this.height - 1n;
				break;
			}

			default: {
				throw new RangeError('Invalid rotation');
			}
		}

		if (this.horizontalReflection) {
			xMain = -xMain;
			xCross = -xCross;
			xOffset = this.width - 1n - xOffset;
		}

		if (this.verticalReflection) {
			yMain = -yMain;
			yCross = -yCross;
			yOffset = this.height - 1n - yOffset;
		}

		return new Point(
			topLeft.x + x * xMain + y * xCross + xOffset,
			topLeft.y + x * yMain + y * yCross + yOffset,
		);
	}

	transformTile(x: bigint, y: bigint): tileType.QuadTreeTileType {
		const tile = this.tiles[asNumber(x + y * this.width)] ?? tileType.empty;

		if (
			!tileType.isRotatedFormOf(tile, tileType.conjoinN) &&
			!tileType.isRotatedFormOf(tile, tileType.disjoinN)
		) {
			return tile;
		}

		const type = Math.trunc(tile / 10) * 10;
		let dir = tile % 10;

		dir += this.rotation * 4;

		if (this.horizontalReflection) {
			dir = 4 - (dir % 4);
		}

		if (this.verticalReflection) {
			dir = 6 - (dir % 4);
		}

		const newTile = type + (dir % 4);
		// Cast safety: Array.includes is too narrowly typed.
		assert(
			tileType.quadTreeTileType.includes(
				newTile as tileType.QuadTreeTileType,
			),
		);
		// Cast safety: Asserted above.
		return newTile as tileType.QuadTreeTileType;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	toJSON() {
		const length = asNumber(this.width * this.height);
		const tiles = this.tiles.slice(0, length);

		for (let i = tiles.length; i < length; i++) {
			tiles.push(tileType.empty);
		}

		// eslint-disable-next-line @internal/no-object-literals
		return {
			version: currentSaveVersion,
			width: asNumber(this.width),
			tiles,
		};
	}
}
