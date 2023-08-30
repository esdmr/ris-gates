import {createClickHandler, query} from '../../lib/dom.js';
import {extendKeyBinds} from '../keyboard.js';
import {setMode} from '../mode.js';

const buttonPasteCancel = query('#hud-paste-cancel', HTMLButtonElement);

export function setup() {
	// eslint-disable-next-line @internal/no-object-literals
	extendKeyBinds('Escape', {pasting: createClickHandler(buttonPasteCancel)});
}

buttonPasteCancel.addEventListener('click', () => {
	setMode('normal');
});
