import {maybeCompress, maybeDecompress} from '../lib/compress.js';
import {Schematic} from '../lib/schematic.js';
import {QuadTree, currentSaveVersion} from '../lib/tree.js';
import * as storage from './storage.js';
import * as dialogIncompatible from './dialog/incompatible.js';

const versionPattern = /^(\d+)\.(\d+)$/;

export const previousVersion = versionPattern
	.exec(storage.getString('version', storage.configPrefix, ''))
	?.slice(1)
	.map(Number) ?? [1, 0];

export async function setup() {
	if (!storage.localStorageAvailable) return;

	if (
		previousVersion[0] !== currentSaveVersion[0] ||
		(previousVersion[1] ?? 0) > currentSaveVersion[1]
	) {
		dialogIncompatible.open();
	} else if (previousVersion[1] !== currentSaveVersion[1]) {
		await upgradePrefix(storage.savePrefix, QuadTree.from);
		await upgradePrefix(storage.schematicPrefix, Schematic.from);

		storage.setString(
			'version',
			currentSaveVersion.join('.'),
			storage.configPrefix,
		);
	}
}

async function upgradePrefix(
	prefix: string,
	constructor: (json: unknown) => unknown,
) {
	for (const key of storage.listStorage(prefix)) {
		try {
			const tree = constructor(
				await maybeDecompress(storage.getString(key, prefix, '')),
			);
			storage.setString(key, await maybeCompress(tree));
		} catch (error) {
			console.warn(
				'Error while upgrading',
				prefix + key,
				previousVersion,
				currentSaveVersion,
				error,
			);
		}
	}
}
