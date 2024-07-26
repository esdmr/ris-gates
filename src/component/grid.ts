import {parseBigInt} from '../lib/bigint.js';
import * as storage from './storage.js';

const configMinorGrid = 'minor-grid';
const configMajorGrid = 'major-grid';
export let shouldDrawMinorGrid = false;
export let majorGridLength = 0n;

export function setMinorGridVisibility(visible: boolean) {
	shouldDrawMinorGrid = visible;
	storage.setString(
		configMinorGrid,
		shouldDrawMinorGrid ? 'y' : '',
		storage.configPrefix,
	);
}

export function setMajorGridLength(length: bigint) {
	majorGridLength = length;
	storage.setString(
		configMajorGrid,
		String(majorGridLength),
		storage.configPrefix,
	);
}

export function setup() {
	setMinorGridVisibility(
		Boolean(storage.getString(configMinorGrid, storage.configPrefix)),
	);
	setMajorGridLength(
		parseBigInt(
			storage.getString(configMajorGrid, storage.configPrefix, '0'),
		),
	);
}
