import {clearEvalContext, getEvalContext} from '../eval.js';
import {assert, nonNullable} from '../lib/assert.js';
import {query} from '../lib/dom.js';
import * as tileType from '../lib/tile-type.js';
import * as selection from '../selection.js';
import * as dialogs from './dialogs.js';

const ctrlEmpty = query('#ctrl-empty', HTMLButtonElement);
const ctrlIo = query('#ctrl-io', HTMLButtonElement);
const ctrlNegate = query('#ctrl-negate', HTMLButtonElement);
const ctrlConjoin = query('#ctrl-conjoin', HTMLButtonElement);
const ctrlDisjoin = query('#ctrl-disjoin', HTMLButtonElement);
const ctrlDir = query('#ctrl-dir', HTMLButtonElement);
const ctrlDirPath = query('#ctrl-dir path', SVGPathElement);
const ctrlDirTitle = query('#ctrl-dir title', SVGTitleElement);
const ctrlMenu = query('#ctrl-menu', HTMLButtonElement);
const ctrlUnselect = query('#ctrl-unselect', HTMLButtonElement);
const ctrlDelete = query('#ctrl-delete', HTMLButtonElement);
const ctrlCut = query('#ctrl-cut', HTMLButtonElement);
const ctrlCopy = query('#ctrl-copy', HTMLButtonElement);
const ctrlPaste = query('#ctrl-paste', HTMLButtonElement);
const ctrlPasteCancel = query('#ctrl-paste-cancel', HTMLButtonElement);
const ctrlEval = query('#ctrl-eval', HTMLButtonElement);
const ctrlTickBwdStable = query('#ctrl-tick-bwd-stable', HTMLButtonElement);
const ctrlTickBwd = query('#ctrl-tick-bwd', HTMLButtonElement);
const ctrlTickNo = query('#ctrl-tick-no', HTMLDivElement);
const ctrlTickFwd = query('#ctrl-tick-fwd', HTMLButtonElement);
const ctrlTickFwdStable = query('#ctrl-tick-fwd-stable', HTMLButtonElement);

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
	const newDirection = nonNullable(directions[newIndex]);
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
			// Cast safety: directionIndex is between 0 and 3. Adding it to
			// conjoinN will result in the four types of conjoin: 10 for
			// conjoinN, 11 for conjoinE, 12 for conjoinS, and 13 for conjoinW.
			return (tileType.conjoinN + directionIndex) as tileType.QuadTreeTileType;
		}

		case 'disjoin': {
			// Cast safety: Same as above, s/conjoin/disjoin/g.
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

		query('title', SVGTitleElement, ctrlEval).textContent = isEval
			? 'modify'
			: 'evaluate';

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
