import {nonNullable} from '../../lib/assert.js';
import {
	createClickHandler,
	createContextMenuHandler,
	query,
} from '../../lib/dom.js';
import * as tileType from '../../lib/tile-type.js';
import * as keyboard from '../keyboard.js';

const buttonEmpty = query('#hud-empty', HTMLButtonElement);
const buttonIo = query('#hud-io', HTMLButtonElement);
const buttonNegate = query('#hud-negate', HTMLButtonElement);
const buttonConjoin = query('#hud-conjoin', HTMLButtonElement);
const buttonDisjoin = query('#hud-disjoin', HTMLButtonElement);
const buttonDir = query('#hud-dir', HTMLButtonElement);
const buttonDirPath = query('#hud-dir path', SVGPathElement);
const buttonDirTitle = query('#hud-dir title', SVGTitleElement);

type ToolTypes = 'empty' | 'io' | 'negate' | 'conjoin' | 'disjoin';
// eslint-disable-next-line @internal/no-object-literals
const directions = ['up', 'right', 'down', 'left'] as const;

let selectedTool: ToolTypes = 'io';
let selectedDirection: (typeof directions)[number] = 'up';

function rotateDirection(offset: 1 | 3) {
	const newIndex =
		(directions.indexOf(selectedDirection) + offset) % directions.length;
	const newDirection = nonNullable(directions[newIndex]);
	selectedDirection = newDirection;
	buttonDirPath.style.transform = `rotate(${newIndex / 4}turn)`;

	const label = `direction: ${newDirection}`;
	buttonDirTitle.textContent = label;
	buttonDir.setAttribute('aria-label', label);
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
	/* eslint-disable @internal/no-object-literals */
	keyboard.extendKeyBinds('KeyQ', {normal: createClickHandler(buttonEmpty)});
	keyboard.extendKeyBinds('Digit1', {normal: createClickHandler(buttonIo)});
	keyboard.extendKeyBinds('Digit2', {normal: createClickHandler(buttonNegate)});
	keyboard.extendKeyBinds('Digit3', {
		normal: createClickHandler(buttonConjoin),
	});
	keyboard.extendKeyBinds('Digit4', {
		normal: createClickHandler(buttonDisjoin),
	});
	keyboard.extendKeyBinds('KeyR', {normal: createClickHandler(buttonDir)});
	keyboard.extendKeyBinds('Shift KeyR', {
		normal: createContextMenuHandler(buttonDir),
	});
	/* eslint-enable @internal/no-object-literals */

	for (const [element, tool] of [
		[buttonEmpty, 'empty'],
		[buttonIo, 'io'],
		[buttonNegate, 'negate'],
		[buttonConjoin, 'conjoin'],
		[buttonDisjoin, 'disjoin'],
		// eslint-disable-next-line @internal/no-object-literals
	] satisfies Array<[HTMLElement, ToolTypes]>) {
		// eslint-disable-next-line @typescript-eslint/no-loop-func
		element.addEventListener('click', () => {
			selectedTool = tool;
		});
	}

	buttonDir.addEventListener('click', () => {
		rotateDirection(1);
	});

	buttonDir.addEventListener('contextmenu', (event) => {
		event.preventDefault();
		rotateDirection(3);
	});
}
