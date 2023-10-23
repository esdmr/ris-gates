import * as dialogAssert from './assert.js';
import * as dialogBrowse from './browse.js';
import * as dialogCopyFailed from './copy-failed.js';
import * as dialogEntry from './entry.js';
import * as dialogEpilepsy from './epilepsy.js';
import * as dialogIncompatible from './incompatible.js';
import * as dialogLoadFailed from './load-failed.js';
import * as dialogLoad from './load.js';
import * as dialogMenu from './menu.js';
import * as dialogMonitor from './monitor.js';
import * as dialogPasteFailed from './paste-failed.js';
import * as dialogSaveFailed from './save-failed.js';
import * as dialogSave from './save.js';
import * as dialogScreenshot from './screenshot.js';
import * as dialogSelection from './selection.js';
import * as dialogSequence from './sequence.js';
import * as dialogSequenceFailed from './sequence-failed.js';

export function setup() {
	dialogAssert.setup();
	dialogBrowse.setup();
	dialogCopyFailed.setup();
	dialogEntry.setup();
	dialogEpilepsy.setup();
	dialogIncompatible.setup();
	dialogLoadFailed.setup();
	dialogLoad.setup();
	dialogMenu.setup();
	dialogMonitor.setup();
	dialogPasteFailed.setup();
	dialogSaveFailed.setup();
	dialogSave.setup();
	dialogScreenshot.setup();
	dialogSelection.setup();
	dialogSequence.setup();
	dialogSequenceFailed.setup();
}
