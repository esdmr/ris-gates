import {exists, load, localStorageAvailable, save} from './storage.js';

const autoSaveKey = '__auto_save__';
let shouldAutoSave = localStorageAvailable;

export function updateAutoSaveState(removedKey: string) {
	if (removedKey === autoSaveKey) {
		shouldAutoSave = false;
	}
}

export function setup() {
	if (shouldAutoSave && exists(autoSaveKey)) {
		load(autoSaveKey);
	}

	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden' && shouldAutoSave) {
			save(autoSaveKey);
		}
	});
}
