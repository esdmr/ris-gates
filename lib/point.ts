/** Coordinate in 2D space */
export class Point {
	constructor(readonly x: bigint, readonly y: bigint) {}

	equals(other: Point) {
		return this.x === other.x && this.y === other.y;
	}
}
