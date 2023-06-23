import {handleTouch, handleWheel} from './input.js';
import {
	QuadTree,
	AxisAlignedBoundingBox,
	Point,
	type QuadTreeNodeType,
	type QuadTreeNode,
	type PartitionIndex,
	assert,
} from './lib.js';

const tree = new QuadTree();

tree.getTileData(new Point(1n, 1n), 'make').type = 'source';
tree.getTileData(new Point(2n, 1n), 'make').type = 'conjoin';
tree.getTileData(new Point(3n, 1n), 'make').type = 'disjoin';
tree.getTileData(new Point(1000n, 1n), 'make').type = 'disjoin';

(globalThis as any).tree = tree;

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
assert(canvas);
const context = canvas.getContext('2d')!;
assert(context);

class FloatingBigInt {
	bigint = 0n;
	float = 0;

	normalize() {
		if (this.float < 0 || this.float >= 1) {
			this.bigint += BigInt(Math.trunc(this.float));
			this.float %= 1;

			if (this.float < 0) {
				this.bigint -= 1n;
				this.float += 1;
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	toJSON() {
		return {
			bigint: this.bigint.toString(),
			float: this.float.toString(),
		};
	}
}

const scrollX = new FloatingBigInt();
const scrollY = new FloatingBigInt();
const wheelScaleMultiplier = 16;
let scale = 50;
let currentTime = performance.now();

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

	scrollX.float -= touchState.deltaX / scale;
	scrollY.float -= touchState.deltaY / scale;
	scale += touchState.deltaScale;

	if (wheelState.ctrl) {
		scale -= (wheelState.deltaX + wheelState.deltaY) / wheelScaleMultiplier;
	} else {
		scrollX.float += wheelState.deltaX / scale;
		scrollY.float += wheelState.deltaY / scale;
	}

	touchState.reset();
	wheelState.reset();
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
	const subtree = tree.getContainingNode(display);

	const progress: Array<{
		node: QuadTreeNode | undefined;
		index: PartitionIndex | 4;
	}> = [{node: subtree, index: 0 as const}];
	let lastType: QuadTreeNodeType = 'empty';
	context.fillStyle = 'transparent';

	while (progress.length > 0) {
		const {node, index} = progress.at(-1)!;

		if (node === undefined || index === 4 || !display.colliding(node.bounds)) {
			progress.pop();

			if (progress.length > 0) {
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
					: type === 'source'
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
			progress.at(-1)!.index++;
		}
	}

	currentTime = ms;
	requestAnimationFrame(draw);
}

const touchState = handleTouch(canvas);
const wheelState = handleWheel(canvas);

draw(currentTime);
