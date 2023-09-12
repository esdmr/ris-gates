import * as storage from './storage.js';

const autoSaveKey = '__auto_save__';
let shouldAutoSave = storage.localStorageAvailable;

export function updateAutoSaveState(removedKey: string) {
	if (removedKey === autoSaveKey) {
		shouldAutoSave = false;
	}
}

export function setup() {
	if (shouldAutoSave && storage.exists(autoSaveKey)) {
		storage.load(autoSaveKey);
	}

	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden' && shouldAutoSave) {
			storage.save(autoSaveKey);
		}
	});
}
