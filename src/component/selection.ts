import {AxisAlignedBoundingBox} from '../lib/aabb.js';
import {Point} from '../lib/point.js';
import {Schematic} from '../lib/schematic.js';
import * as mode from './mode.js';
import * as tree from './tree.js';

export let firstX = 0n;
export let firstY = 0n;
export let secondX = 0n;
export let secondY = 0n;

export function unselect() {
	mode.setMode('normal');
}

export function setFirstPosition(fromX: bigint, fromY: bigint) {
	firstX = fromX;
	firstY = fromY;
	secondX = fromX;
	secondY = fromY;
	mode.setMode('selected');
}

export function setSecondPosition(toX: bigint, toY: bigint) {
	secondX = toX;
	secondY = toY;
}

export function getBox() {
	return new AxisAlignedBoundingBox(
		new Point(
			firstX > secondX ? secondX : firstX,
			firstY > secondY ? secondY : firstY,
		),
		firstX > secondX ? firstX - secondX + 1n : secondX - firstX + 1n,
		firstY > secondY ? firstY - secondY + 1n : secondY - firstY + 1n,
	);
}

let schematic: Schematic | undefined;

export function copy() {
	schematic = tree.tree.getSchematic(getBox());
	document.body.classList.add('used-clipboard');
}

export function remove() {
	const {width, height} = getBox();
	tree.tree.putSchematic(
		new Schematic([], Number(width), Number(height)),
		getBox().topLeft,
	);
}

export function cut() {
	copy();
	remove();
	unselect();
}

export function paste(point: Point) {
	if (!schematic) return;
	tree.tree.putSchematic(schematic, point);
	firstX = point.x;
	firstY = point.y;
	secondX = firstX + BigInt(schematic.width) - 1n;
	secondY = firstY + BigInt(schematic.height) - 1n;
}

export function hasSchematic() {
	return Boolean(schematic);
}

export function discard() {
	schematic = undefined;
	document.body.classList.remove('used-clipboard');
}
