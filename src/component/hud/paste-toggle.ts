import {createClickHandler, query} from '../../lib/dom.js';
import {extendKeyBinds} from '../keyboard.js';
import {setMode} from '../mode.js';
import * as selection from '../selection.js';

const buttonPaste = query('#hud-paste', HTMLButtonElement);

export function setup() {
	// eslint-disable-next-line @internal/no-object-literals
	extendKeyBinds('Control KeyV', {
		normal: createClickHandler(buttonPaste),
		selected: createClickHandler(buttonPaste),
	});

	buttonPaste.addEventListener('click', () => {
		if (!selection.hasSchematic()) return;
		setMode('pasting');
	});

	buttonPaste.addEventListener('contextmenu', (event) => {
		if (selection.hasSchematic()) {
			selection.discard();
			event.preventDefault();
		}
	});
}
