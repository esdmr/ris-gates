/* eslint-disable @internal/explained-casts */
import {assert} from '../lib/assert.js';
import * as tileType from '../lib/tile-type.js';

const ctrlEmpty = document.querySelector<HTMLButtonElement>('#ctrl-empty')!;
assert(ctrlEmpty);

const ctrlIo = document.querySelector<HTMLButtonElement>('#ctrl-io')!;
assert(ctrlIo);

const ctrlNegate = document.querySelector<HTMLButtonElement>('#ctrl-negate')!;
assert(ctrlNegate);

const ctrlConjoin = document.querySelector<HTMLButtonElement>('#ctrl-conjoin')!;
assert(ctrlConjoin);

const ctrlDisjoin = document.querySelector<HTMLButtonElement>('#ctrl-disjoin')!;
assert(ctrlDisjoin);

const ctrlDir = document.querySelector<HTMLButtonElement>('#ctrl-dir')!;
assert(ctrlDir);

const ctrlDirPoly =
	document.querySelector<SVGPolygonElement>('#ctrl-dir polygon')!;
assert(ctrlDirPoly);

const ctrlDirTitle =
	document.querySelector<SVGTitleElement>('#ctrl-dir title')!;
assert(ctrlDirTitle);

type ToolTypes = 'empty' | 'io' | 'negate' | 'conjoin' | 'disjoin';
const directions = ['up', 'right', 'down', 'left'] as const;
const directionsTile = ['N', 'E', 'S', 'W'] as const;

let selectedTool: ToolTypes = 'io';
let selectedDirection: (typeof directions)[number] = 'up';

const switchTool = (tool: ToolTypes) => () => {
	selectedTool = tool;
};

const rotateDirection = () => {
	const newIndex =
		(directions.indexOf(selectedDirection) + 1) % directions.length;
	const newDirection = directions[newIndex];
	assert(newDirection);
	selectedDirection = newDirection;
	ctrlDirPoly.style.transform = `rotate(${newIndex / 4}turn)`;
	ctrlDirTitle.textContent = `Direction: ${newDirection}`;
};

for (const [element, tool] of [
	[ctrlEmpty, 'empty'],
	[ctrlIo, 'io'],
	[ctrlNegate, 'negate'],
	[ctrlConjoin, 'conjoin'],
	[ctrlDisjoin, 'disjoin'],
] satisfies Array<[HTMLElement, ToolTypes]>) {
	element.addEventListener('click', switchTool(tool));
}

const keys = new Map<string, HTMLButtonElement>([
	['q', ctrlEmpty],
	['1', ctrlIo],
	['2', ctrlNegate],
	['3', ctrlConjoin],
	['4', ctrlDisjoin],
	['r', ctrlDir],
]);

document.body.addEventListener('keydown', (event) => {
	event.preventDefault();
	if (event.repeat) return;
	keys.get(event.key)?.click();
});

ctrlDir.addEventListener('click', rotateDirection);

export function getSelectedTileType() {
	const directionIndex = directions.indexOf(selectedDirection);

	switch (selectedTool) {
		case 'empty': {
			return tileType.empty;
		}

		case 'io': {
			return tileType.io;
		}

		case 'negate': {
			return tileType.negate;
		}

		case 'conjoin': {
			return (tileType.conjoinN + directionIndex) as tileType.QuadTreeTileType;
		}

		case 'disjoin': {
			return (tileType.disjoinN + directionIndex) as tileType.QuadTreeTileType;
		}

		// No default
	}
}
