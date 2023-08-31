import type * as tileType from './tile-type.js';

export class Schematic {
	constructor(
		readonly tiles: readonly tileType.QuadTreeTileType[],
		readonly width: number,
		readonly height: number,
	) {}
}
