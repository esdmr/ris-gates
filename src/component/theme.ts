import * as tileType from '../lib/tile-type.js';
import * as canvas from './canvas.js';

export let backgroundStyle: string;
export let strokeStyle: string;
export let selectionStrokeStyle: string;
export let ghostStrokeStyle: string;
export let passiveFillStyles: Map<tileType.QuadTreeTileType, string>;
export let activeFillStyles: Map<tileType.QuadTreeTileType, string>;

export function updateStylesFromCss() {
	const styles = getComputedStyle(canvas.canvas);
	backgroundStyle = styles.getPropertyValue('--background');
	strokeStyle = styles.getPropertyValue('--foreground');
	selectionStrokeStyle = styles.getPropertyValue('--selection');
	ghostStrokeStyle = styles.getPropertyValue('--ghost');

	const passiveConjoin = styles.getPropertyValue('--passive-conjoin');
	const passiveDisjoin = styles.getPropertyValue('--passive-disjoin');

	passiveFillStyles = new Map([
		[tileType.io, styles.getPropertyValue('--passive-io')],
		[tileType.negate, styles.getPropertyValue('--passive-negate')],
		[tileType.conjoinN, passiveConjoin],
		[tileType.conjoinS, passiveConjoin],
		[tileType.conjoinE, passiveConjoin],
		[tileType.conjoinW, passiveConjoin],
		[tileType.disjoinN, passiveDisjoin],
		[tileType.disjoinS, passiveDisjoin],
		[tileType.disjoinE, passiveDisjoin],
		[tileType.disjoinW, passiveDisjoin],
		[tileType.empty, 'transparent'],
	]);

	const activeConjoin = styles.getPropertyValue('--active-conjoin');
	const activeDisjoin = styles.getPropertyValue('--active-disjoin');

	activeFillStyles = new Map([
		[tileType.io, styles.getPropertyValue('--active-io')],
		[tileType.negate, styles.getPropertyValue('--active-negate')],
		[tileType.conjoinN, activeConjoin],
		[tileType.conjoinS, activeConjoin],
		[tileType.conjoinE, activeConjoin],
		[tileType.conjoinW, activeConjoin],
		[tileType.disjoinN, activeDisjoin],
		[tileType.disjoinS, activeDisjoin],
		[tileType.disjoinE, activeDisjoin],
		[tileType.disjoinW, activeDisjoin],
		[tileType.empty, 'transparent'],
	]);
}

export function setup() {
	matchMedia('(prefers-color-scheme: dark)').addEventListener(
		'change',
		() => {
			updateStylesFromCss();
		},
	);

	updateStylesFromCss();
}
