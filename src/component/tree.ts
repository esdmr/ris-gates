import {defaultScale, maximumScale, minimumScale} from '../lib/constants.js';
import {FloatingBigInt} from '../lib/floating-bigint.js';
import {Point} from '../lib/point.js';
import {Schematic} from '../lib/schematic.js';
import * as tileType from '../lib/tile-type.js';
import {QuadTree} from '../lib/tree.js';

const defaultTree = new Schematic(5, 5, [
	tileType.empty,
	tileType.empty,
	tileType.io,
	tileType.empty,
	tileType.empty,

	tileType.empty,
	tileType.conjoinS,
	tileType.disjoinS,
	tileType.empty,
	tileType.empty,

	tileType.io,
	tileType.conjoinE,
	tileType.negate,
	tileType.disjoinW,
	tileType.io,

	tileType.empty,
	tileType.empty,
	tileType.conjoinN,
	tileType.conjoinW,
	tileType.empty,

	tileType.empty,
	tileType.empty,
	tileType.io,
]);

export let tree = new QuadTree();
tree.putSchematic(defaultTree, new Point(1n, 1n));

export function replaceTree(newTree: QuadTree) {
	tree = newTree;
}

export const scrollX = /* @__PURE__ */ new FloatingBigInt();
export const scrollY = /* @__PURE__ */ new FloatingBigInt();
export let scale = defaultScale;

export function setScale(newScale: number) {
	scale = newScale;
	if (!Number.isFinite(scale)) scale = defaultScale;
	else if (scale < minimumScale) scale = minimumScale;
	else if (scale > maximumScale) scale = maximumScale;
}
