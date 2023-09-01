export const branch = 0;
export const empty = 1;
export const io = 2;
export const negate = 3;
export const conjoinN = 10;
export const conjoinE = 11;
export const conjoinS = 12;
export const conjoinW = 13;
export const disjoinN = 20;
export const disjoinE = 21;
export const disjoinS = 22;
export const disjoinW = 23;

export const quadTreeTileType = [
	empty,
	io,
	negate,
	conjoinN,
	conjoinE,
	conjoinS,
	conjoinW,
	disjoinN,
	disjoinE,
	disjoinS,
	disjoinW,
] as const;

export type QuadTreeTileType = (typeof quadTreeTileType)[number];

export function isRotatedFormOf(
	type: QuadTreeTileType,
	north: typeof conjoinN | typeof disjoinN,
) {
	return typeof type === 'number' && Math.trunc(type / 10) * 10 === north;
}
