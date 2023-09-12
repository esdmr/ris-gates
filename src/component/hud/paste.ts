import {createClickHandler, query} from '../../lib/dom.js';
import * as keyboard from '../keyboard.js';
import * as mode from '../mode.js';

const buttonPasteCancel = query('#hud-paste-cancel', HTMLButtonElement);

export function setup() {
	// eslint-disable-next-line @internal/no-object-literals
	keyboard.extendKeyBinds('Escape', {
		pasting: createClickHandler(buttonPasteCancel),
	});
}

buttonPasteCancel.addEventListener('click', () => {
	mode.setMode('normal');
});
