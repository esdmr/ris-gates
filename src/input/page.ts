import {exists, load, save} from '../storage.js';

const autoSaveKey = '__auto_save__';
let shouldAutoSave = true;

export function updateAutoSaveState(removedKey: string) {
	if (removedKey === autoSaveKey) {
		shouldAutoSave = false;
	}
}

export function setup() {
	if (exists(autoSaveKey)) {
		load(autoSaveKey);
	}

	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden' && shouldAutoSave) {
			save(autoSaveKey);
		}
	});
}
