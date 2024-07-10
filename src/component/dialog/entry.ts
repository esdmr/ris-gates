import {create, query, setupDialogCloseButton} from '../../lib/dom.js';
import type {SequencerContext} from '../../lib/sequencer.js';
import * as mode from '../mode.js';

const dialogEntry = query('#dialog-entry', HTMLDialogElement);
const footer = query('.footer', HTMLDivElement, dialogEntry);

let resolve: ((value: number) => void) | undefined;
let reject: ((reason?: unknown) => void) | undefined;

export function setup() {
	mode.setupDialog(dialogEntry);
	setupDialogCloseButton(dialogEntry);

	dialogEntry.addEventListener('close', () => {
		const children = [...footer.children];

		for (const child of children) {
			child.remove();
		}

		if (dialogEntry.returnValue) {
			resolve?.(Number.parseInt(dialogEntry.returnValue, 10));
		} else {
			reject?.(new Error('Paste dialog closed'));
		}

		resolve = undefined;
		reject = undefined;
	});
}

export async function open(context: SequencerContext) {
	mode.openDialog(dialogEntry);
	const entries = [...context.publicLabels.entries()].sort(
		([p, a], [q, b]) => a - b || p.localeCompare(q, 'en'),
	);

	for (const [label, index] of entries) {
		footer.append(
			create(
				'button',
				// eslint-disable-next-line @internal/no-object-literals
				{
					value: index,
					form: 'frm-entry',
					class: 'full-width',
				},
				label || 'Top of the script',
			),
		);
	}

	reject?.(new Error('Entry dialog reopened'));

	return new Promise<number>((resolve_, reject_) => {
		resolve = resolve_;
		reject = reject_;
	});
}
