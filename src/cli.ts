/* eslint-disable no-await-in-loop, @internal/no-object-literals */
import {readFile} from 'node:fs/promises';
import process from 'node:process';
import {createInterface} from 'node:readline/promises';
import {parseArgs} from 'node:util';
import {assert, nonNullable} from './lib/assert.js';
import {evalEvents} from './lib/eval.js';
import {SequencerAssertion, SequencerContext} from './lib/sequencer.js';
import {QuadTree} from './lib/tree.js';

const {
	values: {input, label, rate, strict},
} = parseArgs({
	options: {
		input: {
			type: 'string',
			short: 'i',
		},
		label: {
			type: 'string',
			short: 'l',
		},
		rate: {
			type: 'string',
			short: 'r',
			default: import.meta.env.DEV ? '15' : '60',
		},
		strict: {
			type: 'boolean',
			short: 's',
		},
	},
	strict: true,
});

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
});

const json = input
	? await readFile(input, 'utf8')
	: await rl.question('Import: ');

const tree = QuadTree.from(JSON.parse(json));
const context = new SequencerContext(tree);

let target = label;

while (!context.publicLabels.has(target ?? '')) {
	target =
		context.publicLabels.size === 1
			? [...context.publicLabels.keys()][0]
			: await rl.question('Label: ');
}

context.index = nonNullable(context.publicLabels.get(target ?? ''));

evalEvents.addEventListener('yielded', async () => {
	console.log('Yielded.');

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const answer = await rl.question('> ');
		const action = answer.trim();
		// eslint-disable-next-line @typescript-eslint/ban-types
		let match: RegExpExecArray | null;

		// Cast safety: Guaranteed according to the RegExp.
		if ((match = /^([_a-z]\w*) ?= ?(0|1)$/i.exec(action))) {
			context.input(context.getTile(match[1]!), match[2] === '1');
		} else if (/^(?:h|help|\?)$/i.test(action)) {
			console.log('Syntax:');
			console.log('Set a tile: tile = 0');
			console.log('            tile = 1');
			console.log('Syntax guide: help');
			console.log('              h');
			console.log('              ?');
			console.log('Next: next');
			console.log('      continue');
			console.log('      yield');
			console.log('      n');
		} else if (/^(?:n|next|continue|yield)$/i.test(action)) {
			context.status = 'running';
			break;
		} else {
			console.log('Invalid syntax. Type help for syntax guide.');
		}
	}
});

evalEvents.addEventListener('assert', (event) => {
	assert(event instanceof SequencerAssertion);
	console.log(
		'Assert:',
		event.actualTile,
		event.actual,
		'==',
		event.expected,
		event.expectedTile ?? '',
	);

	if (strict) {
		assert(event.actual === event.expected);
	}
});

evalEvents.addEventListener('update', () => {
	if (context.monitoredTiles.length > 0) {
		console.log(
			context.tickCount + ', ' + context.observe().map(Number).join(', '),
		);
	}
});

if (context.monitoredTiles.length > 0) {
	// Cast safety: monitoredTiles is a subset of TilesMap.ioTiles.
	// tileNames also contains a mapping for every item in TilesMap.ioTiles.`
	const names = context.monitoredTiles.map((i) => context.tileNames.get(i)!);
	console.log('#, ' + names.join(', '));
}

context.start(Number(rate));
context.status = 'running';
