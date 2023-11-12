#!/usr/bin/env node
/* eslint-disable @internal/no-object-literals */
import {readFile} from 'node:fs/promises';
import process from 'node:process';
import {createInterface} from 'node:readline/promises';
import {parseArgs} from 'node:util';
import {assert, nonNullable} from './lib/assert.js';
import {EvalStepEvent, evalEvents} from './lib/eval.js';
import {SequencerAssertion, SequencerContext} from './lib/sequencer.js';
import {QuadTree} from './lib/tree.js';
import {maybeCompress, maybeDecompress} from './lib/compress.js';
import {
	generateDecoder,
	generateEncoder,
	generateMultiplexer,
} from './lib/generator.js';

const {
	values: {input, label, rate, strict, generate},
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
		generate: {
			type: 'string',
			short: 'g',
		},
	},
	strict: true,
});

if (generate) {
	const [, type, input_, output_ = '0'] =
		/^(\w{3})(\d+)(?:x(\d+))?$/i.exec(generate) ?? [];
	const input = Number(input_);
	const output = Number(output_);
	let schematic;

	switch (type) {
		case 'mux': {
			schematic = generateMultiplexer(input, output || 1);
			break;
		}

		case 'dem': {
			schematic = generateMultiplexer(output || 1, input);
			break;
		}

		case 'dec': {
			schematic = generateDecoder(input, output || 2 ** input);
			break;
		}

		case 'enc': {
			schematic = generateEncoder(input, output || Math.ceil(Math.log2(input)));
			break;
		}

		default: {
			throw new Error('Unknown type: ' + type);
		}
	}

	console.log(await maybeCompress(schematic));
	process.exit(0);
}

const print = (...args: unknown[]) => {
	console.error(...args);
};

const rl = createInterface({
	input: process.stdin,
	output: process.stderr,
});

const json = input
	? await readFile(input, 'utf8')
	: await rl.question('Import: ');

const tree = QuadTree.from(await maybeDecompress(json));
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
	print('Yielded.');

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
			print('Syntax:');
			print('Set a tile: tile = 0');
			print('            tile = 1');
			print('Syntax guide: help');
			print('              h');
			print('              ?');
			print('Next: next');
			print('      continue');
			print('      yield');
			print('      n');
		} else if (/^(?:n|next|continue|yield)$/i.test(action)) {
			context.status = 'running';
			break;
		} else {
			print('Invalid syntax. Type help for syntax guide.');
		}
	}
});

evalEvents.addEventListener('assert', (event) => {
	assert(event instanceof SequencerAssertion);
	print(
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

evalEvents.addEventListener('update', (event) => {
	assert(event instanceof EvalStepEvent);

	if (context.monitoredTiles.length > 0) {
		console.log(
			context.tickCount +
				',' +
				(event.isStable ? '*' : ' ') +
				', ' +
				context.observe().map(Number).join(', '),
		);
	}
});

if (context.monitoredTiles.length > 0) {
	// Cast safety: monitoredTiles is a subset of TilesMap.ioTiles.
	// tileNames also contains a mapping for every item in TilesMap.ioTiles.`
	const names = context.monitoredTiles.map((i) => context.tileNames.get(i)!);
	console.log('#,*, ' + names.join(', '));
}

context.start(Number(rate));
context.status = 'running';
