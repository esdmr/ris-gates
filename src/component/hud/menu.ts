import {query, createClickHandler} from '../../lib/dom.js';
import * as keyboard from '../keyboard.js';
import * as dialogMenu from '../dialog/menu.js';
import * as dialogSelection from '../dialog/selection.js';

const buttonMenu = query('#hud-menu', HTMLButtonElement);
const buttonMenuSelection = query('#hud-menu-selection', HTMLButtonElement);

export function setup() {
	// eslint-disable-next-line @internal/no-object-literals
	keyboard.extendKeyBinds('Escape', {
		normal: createClickHandler(buttonMenu),
		selected: createClickHandler(buttonMenuSelection),
	});

	buttonMenu.addEventListener('click', () => {
		dialogMenu.open();
	});

	buttonMenuSelection.addEventListener('click', () => {
		dialogSelection.open();
	});
}
