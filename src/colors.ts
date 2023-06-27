import * as tileType from './lib/tile-type.js';

const ioColor = '#0072B2';
const negateColor = '#D55E00';
const conjoinColor = '#009E73';
const disjoinColor = '#E69F00';

// eslint-disable-next-line @internal/no-object-literals
export const activeFillStyles: Record<tileType.QuadTreeTileType, string> = {
	[tileType.io]: ioColor,
	[tileType.negate]: negateColor,
	[tileType.conjoinN]: conjoinColor,
	[tileType.conjoinS]: conjoinColor,
	[tileType.conjoinE]: conjoinColor,
	[tileType.conjoinW]: conjoinColor,
	[tileType.disjoinN]: disjoinColor,
	[tileType.disjoinS]: disjoinColor,
	[tileType.disjoinE]: disjoinColor,
	[tileType.disjoinW]: disjoinColor,
	[tileType.empty]: 'transparent',
};

document.body.style.setProperty('--colors-io', ioColor);
document.body.style.setProperty('--colors-negate', negateColor);
document.body.style.setProperty('--colors-conjoin', conjoinColor);
document.body.style.setProperty('--colors-disjoin', disjoinColor);
