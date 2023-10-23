import {QuadTree} from '../lib/tree.js';
import {maybeCompress, maybeDecompress} from '../lib/compress.js';
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

export async function setup() {
	if (shouldAutoSave && storage.exists(autoSaveKey)) {
		try {
			tree.replaceTree(
				QuadTree.from(
					await maybeDecompress(storage.getString(autoSaveKey, undefined, '')),
				),
			);
		} catch (error) {
			console.error('Auto-load failed:', error);
		}
	}

	document.addEventListener('visibilitychange', async () => {
		if (document.visibilityState === 'hidden' && shouldAutoSave) {
			dialogSequence.saveSequence();
			storage.setString(autoSaveKey, await maybeCompress(tree.tree));
		}
	});
}
