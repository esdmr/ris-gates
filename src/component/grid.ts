import {setString, configPrefix, getString} from './storage.js';

const configMinorGrid = 'minor-grid';
const configMajorGrid = 'major-grid';
export let shouldDrawMinorGrid = false;
export let majorGridLength = 0n;

export function setMinorGridVisibility(visible: boolean) {
	shouldDrawMinorGrid = visible;
	setString(configMinorGrid, shouldDrawMinorGrid ? 'y' : '', configPrefix);
}

export function setMajorGridLength(length: bigint) {
	majorGridLength = length;
	setString(configMajorGrid, String(majorGridLength), configPrefix);
}

export function setup() {
	setMinorGridVisibility(Boolean(getString(configMinorGrid, configPrefix)));
	setMajorGridLength(BigInt(getString(configMajorGrid, configPrefix, 0n)));
}
