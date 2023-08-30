import {query, createClickHandler} from '../../lib/dom.js';
import {extendKeyBinds} from '../keyboard.js';
import * as selection from '../selection.js';

const buttonUnselect = query('#hud-unselect', HTMLButtonElement);
const buttonDelete = query('#hud-delete', HTMLButtonElement);
const buttonCut = query('#hud-cut', HTMLButtonElement);
const buttonCopy = query('#hud-copy', HTMLButtonElement);

export function setup() {
	/* eslint-disable @internal/no-object-literals */
	extendKeyBinds('Escape', {selected: createClickHandler(buttonUnselect)});
	extendKeyBinds('Control KeyX', {selected: createClickHandler(buttonCut)});
	extendKeyBinds('Control KeyC', {selected: createClickHandler(buttonCopy)});
	extendKeyBinds('Delete', {selected: createClickHandler(buttonDelete)});
	/* eslint-enable @internal/no-object-literals */

	buttonUnselect.addEventListener('click', () => {
		selection.unselect();
	});

	buttonDelete.addEventListener('click', () => {
		selection.remove();
	});

	buttonCut.addEventListener('click', () => {
		selection.cut();
	});

	buttonCopy.addEventListener('click', () => {
		selection.copy();
	});
}
