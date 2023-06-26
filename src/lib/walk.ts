import type {QuadTreeChildIndex} from './aabb.js';
import type {QuadTreeNode} from './node.js';

export class WalkStep {
	constructor(
		readonly node: QuadTreeNode | undefined,
		public index: QuadTreeChildIndex | 4 = 0,
	) {}
}
