import * as tileType from './tile-type.js';

const ioColorActive = '#0072B2';
const negateColorActive = '#D55E00';
const conjoinColorActive = '#009E73';
const disjoinColorActive = '#E69F00';

document.body.style.setProperty('--colors-io', ioColorActive);
document.body.style.setProperty('--colors-negate', negateColorActive);
document.body.style.setProperty('--colors-conjoin', conjoinColorActive);
document.body.style.setProperty('--colors-disjoin', disjoinColorActive);

const ioColorPassive = '#003C75';
const conjoinColorPassive = '#00532F';
const disjoinColorPassive = '#7D4600';

export const passiveFillStyles = new Map<tileType.QuadTreeTileType, string>([
	[tileType.io, ioColorPassive],
	[tileType.negate, negateColorActive],
	[tileType.conjoinN, conjoinColorPassive],
	[tileType.conjoinS, conjoinColorPassive],
	[tileType.conjoinE, conjoinColorPassive],
	[tileType.conjoinW, conjoinColorPassive],
	[tileType.disjoinN, disjoinColorPassive],
	[tileType.disjoinS, disjoinColorPassive],
	[tileType.disjoinE, disjoinColorPassive],
	[tileType.disjoinW, disjoinColorPassive],
	[tileType.empty, 'transparent'],
]);

export const activeFillStyles = new Map<tileType.QuadTreeTileType, string>([
	[tileType.io, ioColorActive],
	[tileType.negate, negateColorActive],
	[tileType.conjoinN, conjoinColorActive],
	[tileType.conjoinS, conjoinColorActive],
	[tileType.conjoinE, conjoinColorActive],
	[tileType.conjoinW, conjoinColorActive],
	[tileType.disjoinN, disjoinColorActive],
	[tileType.disjoinS, disjoinColorActive],
	[tileType.disjoinE, disjoinColorActive],
	[tileType.disjoinW, disjoinColorActive],
	[tileType.empty, 'transparent'],
]);
