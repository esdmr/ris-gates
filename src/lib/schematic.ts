import {assertObject, assertArray, assert} from './assert.js';
import {Point} from './point.js';
import * as tileType from './tile-type.js';

// eslint-disable-next-line @internal/no-object-literals
const currentSchematicVersion = [1, 0] as const;

export class Schematic {
	static from(json: unknown) {
		assertObject(json);

		const {version = [1, 0]} = json;

		assertArray(version);
		assert(
			version[0] === currentSchematicVersion[0] &&
				typeof version[1] === 'number' &&
				version[1] <= currentSchematicVersion[1],
		);

		const {width, tiles} = json;
		assert(typeof width === 'number' && Number.isSafeInteger(width));
		assertArray(tiles);

		const height = tiles.length / width;
		assert(width <= tiles.length && Number.isSafeInteger(height));

		assert(
			tiles.every((i) =>
				// Cast safety: Array.includes is too narrowly typed.
				tileType.quadTreeTileType.includes(i as tileType.QuadTreeTileType),
			),
		);

		// Cast safety: Asserted above.
		return new Schematic(width, height, tiles as tileType.QuadTreeTileType[]);
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
		readonly tiles: readonly tileType.QuadTreeTileType[],
	) {}

	transform(x: number, y: number, topLeft: Point) {
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
					(-1 + cos - cos * height + realHeight + sin - sin * width) / 2 +
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
					(-1 + cos - cos * height + realHeight + sin - sin * width) / 2 +
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

	// eslint-disable-next-line @typescript-eslint/naming-convention
	toJSON() {
		const length = this.width * this.height;
		const tiles = this.tiles.slice(0, length);

		for (let i = tiles.length; i < length; i++) {
			tiles.push(tileType.empty);
		}

		// eslint-disable-next-line @internal/no-object-literals
		return {
			version: currentSchematicVersion,
			width: this.width,
			tiles,
		};
	}
}
