import {createClickHandler, query} from '../../lib/dom.js';
import * as keyboard from '../keyboard.js';
import * as mode from '../mode.js';
import * as selection from '../selection.js';
import * as paste from './paste.js';

const buttonPaste = query('#hud-paste', HTMLButtonElement);

export function setup() {
	// eslint-disable-next-line @internal/no-object-literals
	keyboard.extendKeyBinds('Control KeyV', {
		normal: createClickHandler(buttonPaste),
		selected: createClickHandler(buttonPaste),
	});

	buttonPaste.addEventListener('click', () => {
		if (!selection.clipboard) return;
		mode.setMode('pasting');
		paste.update();
	});

	buttonPaste.addEventListener('contextmenu', (event) => {
		if (selection.clipboard) {
			selection.setClipboard(undefined);
			event.preventDefault();
		}
	});
}
