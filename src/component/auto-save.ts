import {QuadTree} from '../lib/tree.js';
import * as storage from './storage.js';
import * as tree from './tree.js';
import * as dialogSequence from './dialog/sequence.js';

const autoSaveKey = '__auto_save__';
let shouldAutoSave = storage.localStorageAvailable;

export function updateAutoSaveState(removedKey: string) {
	if (removedKey === autoSaveKey) {
		shouldAutoSave = false;
	}
}

export function setup() {
	if (shouldAutoSave && storage.exists(autoSaveKey)) {
		tree.replaceTree(
			QuadTree.from(
				JSON.parse(storage.getString(autoSaveKey, undefined, 'null')),
			),
		);
	}

	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden' && shouldAutoSave) {
			dialogSequence.saveSequence();
			storage.setString(autoSaveKey, JSON.stringify(tree.tree));
		}
	});
}
