/* eslint-disable @internal/explained-casts */
import {clearEvalContext, getEvalContext} from '../eval.js';
import {assert} from '../lib/assert.js';
import * as tileType from '../lib/tile-type.js';
import * as selection from '../selection.js';
import * as dialogs from './dialogs.js';

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

const ctrlUnselect =
	document.querySelector<HTMLButtonElement>('#ctrl-unselect')!;
assert(ctrlUnselect);

const ctrlDelete = document.querySelector<HTMLButtonElement>('#ctrl-delete')!;
assert(ctrlDelete);

const ctrlCut = document.querySelector<HTMLButtonElement>('#ctrl-cut')!;
assert(ctrlCut);

const ctrlCopy = document.querySelector<HTMLButtonElement>('#ctrl-copy')!;
assert(ctrlCopy);

const ctrlPaste = document.querySelector<HTMLButtonElement>('#ctrl-paste')!;
assert(ctrlPaste);

const ctrlPasteCancel =
	document.querySelector<HTMLButtonElement>('#ctrl-paste-cancel')!;
assert(ctrlPasteCancel);

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

let selectedTool: ToolTypes = 'io';
let selectedDirection: (typeof directions)[number] = 'up';
export let isEval = false;
export let shouldPaste = false;
let stabilityInterval: ReturnType<typeof setInterval> | undefined;

function switchTool(tool: ToolTypes) {
	return () => {
		selectedTool = tool;
	};
}

function rotateDirection() {
	const newIndex =
		(directions.indexOf(selectedDirection) + 1) % directions.length;
	const newDirection = directions[newIndex];
	assert(newDirection);
	selectedDirection = newDirection;
	ctrlDirPath.style.transform = `rotate(${newIndex / 4}turn)`;

	const label = `direction: ${newDirection}`;
	ctrlDirTitle.textContent = label;
	ctrlDir.setAttribute('aria-label', label);
}

function startStabilityInterval(type: 'tickForward' | 'tickBackward') {
	clearInterval(stabilityInterval);

	stabilityInterval = setInterval(() => {
		const evalContext = getEvalContext();

		if (!isEval || !evalContext[type]()) {
			clearInterval(stabilityInterval);
			stabilityInterval = undefined;
		}

		ctrlTickNo.textContent = String(evalContext.tickCount);
	}, 1000 / dialogs.evaluationRate);
}

export function donePasting() {
	shouldPaste = false;
	document.body.classList.remove('pasting');
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

export function setup() {
	for (const [element, tool] of [
		[ctrlEmpty, 'empty'],
		[ctrlIo, 'io'],
		[ctrlNegate, 'negate'],
		[ctrlConjoin, 'conjoin'],
		[ctrlDisjoin, 'disjoin'],
	] satisfies Array<[HTMLElement, ToolTypes]>) {
		element.addEventListener('click', switchTool(tool));
	}

	const keys = new Map<
		string,
		{
			normal?: HTMLButtonElement;
			eval?: HTMLButtonElement;
			selected?: HTMLButtonElement;
			pasting?: HTMLButtonElement;
		}
	>([
		/* eslint-disable @internal/no-object-literals */
		['q', {normal: ctrlEmpty}],
		['1', {normal: ctrlIo, eval: ctrlTickBwdStable}],
		['2', {normal: ctrlNegate, eval: ctrlTickBwd}],
		['3', {normal: ctrlConjoin, eval: ctrlTickFwd}],
		['4', {normal: ctrlDisjoin, eval: ctrlTickFwdStable}],
		['e', {normal: ctrlEval, eval: ctrlEval}],
		['r', {normal: ctrlDir}],
		[
			'Escape',
			{normal: ctrlMenu, selected: ctrlUnselect, pasting: ctrlPasteCancel},
		],
		['Control+x', {selected: ctrlCut}],
		['Control+c', {selected: ctrlCopy}],
		['Control+v', {normal: ctrlPaste, selected: ctrlPaste}],
		['Delete', {selected: ctrlDelete}],
		/* eslint-enable @internal/no-object-literals */
	]);

	document.body.addEventListener('keydown', (event) => {
		const key = (event.ctrlKey ? 'Control+' : '') + event.key;
		if (!keys.has(key) || dialogs.isMenuDialogOpen()) return;
		event.preventDefault();
		if (event.repeat) return;
		keys
			.get(key)
			?.[
				isEval
					? 'eval'
					: shouldPaste
					? 'pasting'
					: selection.isSelecting
					? 'selected'
					: 'normal'
			]?.click();
	});

	ctrlUnselect.addEventListener('click', () => {
		selection.unselect();
	});

	ctrlDelete.addEventListener('click', () => {
		selection.remove();
	});

	ctrlCut.addEventListener('click', () => {
		selection.cut();
	});

	ctrlCopy.addEventListener('click', () => {
		selection.copy();
	});

	ctrlPaste.addEventListener('click', () => {
		if (!selection.hasSavedTiles()) return;
		shouldPaste = true;
		document.body.classList.add('pasting');
	});

	ctrlPaste.addEventListener('contextmenu', (event) => {
		if (selection.hasSavedTiles()) {
			selection.discard();
			event.preventDefault();
		}
	});

	ctrlPasteCancel.addEventListener('click', () => {
		donePasting();
	});

	ctrlDir.addEventListener('click', rotateDirection);

	ctrlEval.addEventListener('click', () => {
		isEval = !isEval;
		document.body.classList.toggle('eval', isEval);
		clearEvalContext();
		clearInterval(stabilityInterval);
		ctrlTickNo.textContent = '0';

		const title = ctrlEval.querySelector('title');
		if (title) {
			title.textContent = isEval ? 'modify' : 'evaluate';
		}

		if (isEval) dialogs.maybeShowEpilepsyWarning();
	});

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
}
