import {assertObject, assertArray, assert} from './assert.js';
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

	constructor(
		readonly width: number,
		readonly height: number,
		readonly tiles: readonly tileType.QuadTreeTileType[],
	) {}

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
