export const empty = import.meta.env.DEV ? 'empty' : 0;
export const io = import.meta.env.DEV ? 'io' : 1;
export const negate = import.meta.env.DEV ? 'negate' : 2;
export const conjoinN = import.meta.env.DEV ? 'conjoinN' : 3;
export const conjoinS = import.meta.env.DEV ? 'conjoinS' : 4;
export const conjoinE = import.meta.env.DEV ? 'conjoinE' : 5;
export const conjoinW = import.meta.env.DEV ? 'conjoinW' : 6;
export const disjoinN = import.meta.env.DEV ? 'disjoinN' : 7;
export const disjoinS = import.meta.env.DEV ? 'disjoinS' : 8;
export const disjoinE = import.meta.env.DEV ? 'disjoinE' : 9;
export const disjoinW = import.meta.env.DEV ? 'disjoinW' : 10;

export type QuadTreeTileType =
	| typeof empty
	| typeof io
	| typeof negate
	| typeof conjoinN
	| typeof conjoinS
	| typeof conjoinE
	| typeof conjoinW
	| typeof disjoinN
	| typeof disjoinS
	| typeof disjoinE
	| typeof disjoinW;
