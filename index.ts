import {Point} from './lib/point.js';
import {canvas, context} from './canvas.js';
import {AxisAlignedBoundingBox, type QuadTreeChildIndex} from './lib/aabb.js';
import {
	searchModeFind,
	type QuadTreeNode,
	type QuadTreeNodeType,
	searchModeMake,
} from './lib/node.js';
import {QuadTree} from './lib/tree.js';
import * as pointer from './input/pointer.js';
import * as wheel from './input/wheel.js';
import {FloatingBigInt} from './lib/floating-bigint.js';

declare global {
	/** @internal For debug purposes only. */
	// eslint-disable-next-line no-var
	var tree: QuadTree;
}

const tree = new QuadTree();
globalThis.tree = tree;

tree.getTileData(new Point(0n, 1n), searchModeMake).type = 'negate';
tree.getTileData(new Point(1n, 1n), searchModeMake).type = 'io';
tree.getTileData(new Point(2n, 1n), searchModeMake).type = 'conjoin';
tree.getTileData(new Point(3n, 1n), searchModeMake).type = 'disjoin';
tree.getTileData(new Point(1000n, 1n), searchModeMake).type = 'disjoin';

const scrollX = new FloatingBigInt();
const scrollY = new FloatingBigInt();
const pointerScaleMultiplier = 0.75;
const wheelScaleMultiplier = 0.2;
const minimumScale = 4;
let scale = 50;
let currentTime = performance.now();

function getScaleIntOffset(point: number, oldScale: number) {
	return BigInt(Math.trunc(point / oldScale) - Math.trunc(point / scale));
}

function getScaleFloatOffset(point: number, oldScale: number) {
	return ((point / oldScale) % 1) - ((point / scale) % 1);
}

// eslint-disable-next-line complexity
function draw(ms: DOMHighResTimeStamp) {
	const dip = devicePixelRatio;
	const width = canvas.clientWidth * dip;
	const height = canvas.clientHeight * dip;

	if (canvas.width === width && canvas.height === height) {
		context.clearRect(0, 0, width, height);
	} else {
		canvas.width = width;
		canvas.height = height;
	}

	let deltaScale = pointer.deltaScale * pointerScaleMultiplier;

	if (wheel.ctrl) {
		deltaScale -= (wheel.deltaX + wheel.deltaY) * wheelScaleMultiplier;
	} else {
		scrollX.float += wheel.deltaX / scale;
		scrollY.float += wheel.deltaY / scale;
	}

	if (deltaScale) {
		const oldScale = scale;
		scale += deltaScale;
		if (scale < minimumScale) scale = minimumScale;
		scrollX.bigint += getScaleIntOffset(pointer.centerX, oldScale);
		scrollY.bigint += getScaleIntOffset(pointer.centerY, oldScale);
		scrollX.float += getScaleFloatOffset(pointer.centerX, oldScale);
		scrollY.float += getScaleFloatOffset(pointer.centerY, oldScale);
	}

	scrollX.float -= pointer.deltaX / scale;
	scrollY.float -= pointer.deltaY / scale;

	pointer.commit();
	wheel.commit();
	scrollX.normalize();
	scrollY.normalize();

	const realScale = scale * dip;

	const offsetX = Math.trunc(scrollX.float * realScale);
	const offsetY = Math.trunc(scrollY.float * realScale);

	const columns = Math.ceil(canvas.width / realScale) + 1;
	const rows = Math.ceil(canvas.height / realScale) + 1;

	context.lineWidth = dip;

	const point = new Point(scrollX.bigint, scrollY.bigint);
	const display = new AxisAlignedBoundingBox(
		point,
		BigInt(columns),
		BigInt(rows),
	);
	const subtree = tree.getContainingNode(display, searchModeFind);

	const progress: Array<{
		node: QuadTreeNode | undefined;
		index: QuadTreeChildIndex | 4;
	}> = [{node: subtree, index: 0 as const}];

	let lastType: QuadTreeNodeType = 'empty';
	context.fillStyle = 'transparent';

	while (progress.length > 0) {
		// Cast safety: length is at least one, so there is always a last
		// element.
		const {node, index} = progress.at(-1)!;

		if (node === undefined || index === 4 || !display.colliding(node.bounds)) {
			progress.pop();

			if (progress.length > 0) {
				// Cast safety: length is at least one, so there is always a
				// last element.
				progress.at(-1)!.index++;
			}

			continue;
		}

		if (node.type === undefined) {
			progress.push({node: node[index], index: 0});
			continue;
		}

		const i = Number(node.bounds.topLeft.x - scrollX.bigint);
		const j = Number(node.bounds.topLeft.y - scrollY.bigint);

		const {type} = node;
		if (type !== lastType) {
			context.fillStyle =
				type === 'empty'
					? 'transparent'
					: type === 'io'
					? '#00f'
					: type === 'negate'
					? '#f00'
					: type === 'conjoin'
					? '#0f8'
					: '#8f0';
			lastType = type;
		}

		context.fillRect(
			i * realScale - offsetX,
			j * realScale - offsetY,
			Math.ceil(realScale),
			Math.ceil(realScale),
		);

		if (lastType !== 'empty') {
			context.strokeRect(
				i * realScale - offsetX,
				j * realScale - offsetY,
				Math.ceil(realScale),
				Math.ceil(realScale),
			);
		}

		progress.pop();

		if (progress.length > 0) {
			// Cast safety: length is at least one, so there is always a last
			// element.
			progress.at(-1)!.index++;
		}
	}

	currentTime = ms;
	requestAnimationFrame(draw);
}

draw(currentTime);
