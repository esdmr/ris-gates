/* eslint-disable @internal/explained-casts */
import {clearEvalContext, getEvalContext} from '../eval.js';
import {assert} from '../lib/assert.js';
import * as tileType from '../lib/tile-type.js';
import {isMenuDialogOpen} from './dialogs.js';

const ctrl = document.querySelector<HTMLDivElement>('.controls')!;
assert(ctrl);

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

const ctrlDirPath = document.querySelector<SVGPathElement>('#ctrl-dir path')!;
assert(ctrlDirPath);

const ctrlDirTitle =
	document.querySelector<SVGTitleElement>('#ctrl-dir title')!;
assert(ctrlDirTitle);

const ctrlMenu = document.querySelector<HTMLButtonElement>('#ctrl-menu')!;
assert(ctrlMenu);

const ctrlEval = document.querySelector<HTMLButtonElement>('#ctrl-eval')!;
assert(ctrlEval);

const ctrlTickBwdStable = document.querySelector<HTMLButtonElement>(
	'#ctrl-tick-bwd-stable',
)!;
assert(ctrlTickBwdStable);

const ctrlTickBwd =
	document.querySelector<HTMLButtonElement>('#ctrl-tick-bwd')!;
assert(ctrlTickBwd);

const ctrlTickNo = document.querySelector<HTMLDivElement>('#ctrl-tick-no')!;
assert(ctrlTickNo);

const ctrlTickFwd =
	document.querySelector<HTMLButtonElement>('#ctrl-tick-fwd')!;
assert(ctrlTickFwd);

const ctrlTickFwdStable = document.querySelector<HTMLButtonElement>(
	'#ctrl-tick-fwd-stable',
)!;
assert(ctrlTickFwdStable);

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
	ctrlDirPath.style.transform = `rotate(${newIndex / 4}turn)`;
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

const keys = new Map<string, [HTMLButtonElement, HTMLButtonElement?]>([
	['q', [ctrlEmpty]],
	['1', [ctrlIo, ctrlTickBwdStable]],
	['2', [ctrlNegate, ctrlTickBwd]],
	['3', [ctrlConjoin, ctrlTickFwd]],
	['4', [ctrlDisjoin, ctrlTickFwdStable]],
	['e', [ctrlEval, ctrlEval]],
	['r', [ctrlDir]],
	['Escape', [ctrlMenu]],
]);

document.body.addEventListener('keydown', (event) => {
	if (!keys.has(event.key) || isMenuDialogOpen()) return;
	event.preventDefault();
	if (event.repeat) return;
	keys.get(event.key)?.[isEval ? 1 : 0]?.click();
});

ctrlDir.addEventListener('click', rotateDirection);

export let isEval = false;

ctrlEval.addEventListener('click', () => {
	isEval = !isEval;
	ctrl.classList.toggle('eval', isEval);
	clearEvalContext();
	clearInterval(stabilityInterval);
	ctrlTickNo.textContent = '0';

	const title = ctrlEval.querySelector('title');
	if (title) {
		title.textContent = isEval ? 'Modify' : 'Evaluate';
	}
});

const stabilityTimeout = 1000 / 15;
let stabilityInterval: ReturnType<typeof setInterval> | undefined;

ctrlTickBwdStable.addEventListener('click', () => {
	assert(isEval);
	const evalContext = getEvalContext();
	if (evalContext.tickBackward()) startStabilityInterval('tickBackward');
	ctrlTickNo.textContent = String(evalContext.tickCount);
});

ctrlTickBwd.addEventListener('click', () => {
	assert(isEval);
	const evalContext = getEvalContext();
	evalContext.tickBackward();
	ctrlTickNo.textContent = String(evalContext.tickCount);
	clearInterval(stabilityInterval);
});

ctrlTickFwd.addEventListener('click', () => {
	assert(isEval);
	const evalContext = getEvalContext();
	evalContext.tickForward();
	ctrlTickNo.textContent = String(evalContext.tickCount);
	clearInterval(stabilityInterval);
});

ctrlTickFwdStable.addEventListener('click', () => {
	assert(isEval);
	const evalContext = getEvalContext();
	if (evalContext.tickForward()) startStabilityInterval('tickForward');
	ctrlTickNo.textContent = String(evalContext.tickCount);
});

function startStabilityInterval(type: 'tickForward' | 'tickBackward') {
	clearInterval(stabilityInterval);

	stabilityInterval = setInterval(() => {
		const evalContext = getEvalContext();

		if (!isEval || !evalContext[type]()) {
			clearInterval(stabilityInterval);
			stabilityInterval = undefined;
		}

		ctrlTickNo.textContent = String(evalContext.tickCount);
	}, stabilityTimeout);
}

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
