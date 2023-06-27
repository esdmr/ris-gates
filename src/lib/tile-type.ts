export const serializedBranch = 0;
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

export type QuadTreeTileType =
	| typeof empty
	| typeof io
	| typeof negate
	| typeof conjoinN
	| typeof conjoinE
	| typeof conjoinS
	| typeof conjoinW
	| typeof disjoinN
	| typeof disjoinE
	| typeof disjoinS
	| typeof disjoinW;

export function isConjoin(type: QuadTreeTileType) {
	return typeof type === 'number' && Math.trunc(type / 10) * 10 === conjoinN;
}

export function isDisjoin(type: QuadTreeTileType) {
	return typeof type === 'number' && Math.trunc(type / 10) * 10 === disjoinN;
}
