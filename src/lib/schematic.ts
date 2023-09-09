import type * as tileType from './tile-type.js';

export class Schematic {
	constructor(
		readonly width: number,
		readonly height: number,
		readonly tiles: readonly tileType.QuadTreeTileType[],
	) {}
}
