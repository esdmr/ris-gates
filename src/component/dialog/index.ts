import * as dialogBrowse from './browse.js';
import * as dialogCopyFailed from './copy-failed.js';
import * as dialogEpilepsy from './epilepsy.js';
import * as dialogLoadFailed from './load-failed.js';
import * as dialogLoad from './load.js';
import * as dialogMenu from './menu.js';
import * as dialogPasteFailed from './paste-failed.js';
import * as dialogSaveFailed from './save-failed.js';
import * as dialogSave from './save.js';
import * as dialogScreenshot from './screenshot.js';

export function setup() {
	dialogBrowse.setup();
	dialogCopyFailed.setup();
	dialogEpilepsy.setup();
	dialogLoadFailed.setup();
	dialogLoad.setup();
	dialogMenu.setup();
	dialogPasteFailed.setup();
	dialogSaveFailed.setup();
	dialogSave.setup();
	dialogScreenshot.setup();
}
