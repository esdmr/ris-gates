export const io = 'io';
export const negate = 'negate';
export const conjoinN = 'conjoinN';
export const conjoinS = 'conjoinS';
export const conjoinE = 'conjoinE';
export const conjoinW = 'conjoinW';
export const disjoinN = 'disjoinN';
export const disjoinS = 'disjoinS';
export const disjoinE = 'disjoinE';
export const disjoinW = 'disjoinW';
export const empty = 'empty';

export type QuadTreeTileType =
	| typeof io
	| typeof negate
	| typeof conjoinN
	| typeof conjoinS
	| typeof conjoinE
	| typeof conjoinW
	| typeof disjoinN
	| typeof disjoinS
	| typeof disjoinE
	| typeof disjoinW
	| typeof empty;
