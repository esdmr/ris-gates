import * as tileType from './lib/tile-type.js';

// eslint-disable-next-line @internal/no-object-literals
export const activeFillStyles: Record<tileType.QuadTreeTileType, string> = {
	[tileType.io]: '#0072B2',
	[tileType.negate]: '#D55E00',
	[tileType.conjoinN]: '#009E73',
	[tileType.conjoinS]: '#009E73',
	[tileType.conjoinE]: '#009E73',
	[tileType.conjoinW]: '#009E73',
	[tileType.disjoinN]: '#E69F00',
	[tileType.disjoinS]: '#E69F00',
	[tileType.disjoinE]: '#E69F00',
	[tileType.disjoinW]: '#E69F00',
	[tileType.empty]: 'transparent',
};
