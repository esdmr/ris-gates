import type {QuadTreeTileType} from './tile-type.js';

export class Schematic {
	constructor(
		readonly tiles: readonly QuadTreeTileType[],
		readonly width: number,
		readonly height: number,
	) {}
}
