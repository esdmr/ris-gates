import {query, createClickHandler} from '../../lib/dom.js';
import {extendKeyBinds} from '../keyboard.js';
import * as dialogMenu from '../dialog/menu.js';

const buttonMenu = query('#hud-menu', HTMLButtonElement);

export function setup() {
	// eslint-disable-next-line @internal/no-object-literals
	extendKeyBinds('Escape', {normal: createClickHandler(buttonMenu)});

	buttonMenu.addEventListener('click', () => {
		dialogMenu.open();
	});
}
