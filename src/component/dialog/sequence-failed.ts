import {create, query, setupDialogCloseButton} from '../../lib/dom.js';
import type {SequencerError} from '../../lib/sequencer.js';
import * as mode from '../mode.js';

const dialogSequenceFailed = query(
	'#dialog-sequence-failed',
	HTMLDialogElement,
);
const list = query('ul', HTMLUListElement, dialogSequenceFailed);

let resolve: (() => void) | undefined;

export function setup() {
	mode.setupDialog(dialogSequenceFailed);
	setupDialogCloseButton(dialogSequenceFailed);

	dialogSequenceFailed.addEventListener('close', () => {
		const children = [...list.children];
		for (const child of children) {
			child.remove();
		}

		resolve?.();
		resolve = undefined;
	});
}

export async function open(errors: readonly SequencerError[]) {
	mode.openDialog(dialogSequenceFailed);

	/* eslint-disable @internal/no-object-literals */
	list.append(
		...errors.map((i) =>
			create(
				'li',
				{
					class: 'error',
				},
				create('span', {class: 'message'}, i.rawMessage),
				create('span', {class: 'lineno'}, String(i.line.index + 1)),
				create('pre', {class: 'line'}, String(i.line.content)),
			),
		),
	);
	/* eslint-enable @internal/no-object-literals */

	return new Promise<void>((resolve_) => {
		resolve = resolve_;
	});
}
