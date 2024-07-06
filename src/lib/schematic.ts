import {assertObject, assertArray, assert} from './assert.js';
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

		const height = tiles.length / width;
		assert(width <= tiles.length && Number.isSafeInteger(height));

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
			width,
			height,
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
		readonly width: number,
		readonly height: number,
		readonly tiles: tileType.QuadTreeTileType[],
	) {}

	transformPoint(x: number, y: number, topLeft: Point) {
		const {width, height, realWidth, realHeight} = this;
		const sin = Math.sin(this.rotation * 2 * Math.PI);
		const cos = Math.cos(this.rotation * 2 * Math.PI);

		let xNew;
		let yNew;

		// These equations are generated via Wolfram Mathematica. See
		// [transform-matrix script](/transform-matrix.wls) for its source.
		switch (
			Number(this.horizontalReflection) +
			Number(this.verticalReflection) * 2
		) {
			case 0: {
				xNew =
					(-1 +
						realWidth +
						cos * (1 - width + 2 * x) +
						sin * (-1 + height - 2 * y)) /
					2;
				yNew =
					(-1 + cos - cos * height + realHeight + sin - sin * width) /
						2 +
					sin * x +
					cos * y;
				break;
			}

			case 1: {
				xNew =
					(-1 +
						realWidth +
						sin -
						height * sin +
						cos * (-1 + width - 2 * x) +
						2 * sin * y) /
					2;
				yNew =
					(-1 + cos - cos * height + realHeight + sin - sin * width) /
						2 +
					sin * x +
					cos * y;
				break;
			}

			case 2: {
				xNew =
					(-1 +
						realWidth +
						cos * (1 - width + 2 * x) +
						sin * (-1 + height - 2 * y)) /
					2;
				yNew =
					(-1 +
						realHeight +
						sin * (-1 + width - 2 * x) +
						cos * (-1 + height - 2 * y)) /
					2;
				break;
			}

			case 3: {
				xNew =
					(-1 +
						realWidth +
						sin -
						height * sin +
						cos * (-1 + width - 2 * x) +
						2 * sin * y) /
					2;
				yNew =
					(-1 +
						realHeight +
						sin * (-1 + width - 2 * x) +
						cos * (-1 + height - 2 * y)) /
					2;
				break;
			}

			default: {
				throw new RangeError('Invalid reflection');
			}
		}

		return new Point(
			topLeft.x + BigInt(Math.round(xNew)),
			topLeft.y + BigInt(Math.round(yNew)),
		);
	}

	transformTile(x: number, y: number): tileType.QuadTreeTileType {
		const tile = this.tiles[x + y * this.width] ?? tileType.empty;

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
		const length = this.width * this.height;
		const tiles = this.tiles.slice(0, length);

		for (let i = tiles.length; i < length; i++) {
			tiles.push(tileType.empty);
		}

		// eslint-disable-next-line @internal/no-object-literals
		return {
			version: currentSaveVersion,
			width: this.width,
			tiles,
		};
	}
}
