import * as edit from './edit.js';
import * as evalToggle from './eval-toggle.js';
import * as eval_ from './eval.js';
import * as menu from './menu.js';
import * as pasteToggle from './paste-toggle.js';
import * as paste from './paste.js';
import * as selection from './selection.js';

export function setup() {
	edit.setup();
	evalToggle.setup();
	eval_.setup();
	menu.setup();
	pasteToggle.setup();
	paste.setup();
	selection.setup();
}
