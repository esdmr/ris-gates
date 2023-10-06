import {assert, nonNullable} from './assert.js';
import {EvalContext, EvalEvent, evalEvents} from './eval.js';
import type {QuadTreeNode} from './node.js';
import {Point} from './point.js';
import {RingBuffer} from './ring.js';
import type {QuadTree} from './tree.js';

const operationJump = 'j';
const operationSet = 's';
const operationSetConstant = 'S';
const operationAssert = 't';
const operationAssertConstant = 'T';
const operationYieldInclude = 'y';
const operationYieldExclude = 'Y';
const operationNext = 'n';
const operationNextStable = 'N';

/* eslint-disable @internal/no-object-literals */
type SequencerNodeType =
	| [type: typeof operationJump, name: string]
	| [type: typeof operationSet, dest: string, src: string]
	| [type: typeof operationSetConstant, dest: string, src: boolean]
	| [type: typeof operationAssert, actual: string, expected: string]
	| [type: typeof operationAssertConstant, actual: string, expected: boolean]
	| [type: typeof operationYieldInclude, ...tiles: string[]]
	| [type: typeof operationYieldExclude, ...tiles: string[]]
	| [type: typeof operationNext, ticks: bigint]
	| [type: typeof operationNextStable];
/* eslint-enable @internal/no-object-literals */

class SequencerNode {
	readonly args: SequencerNodeType;

	constructor(
		readonly line: SequencerLine,
		...args: SequencerNodeType
	) {
		this.args = args;
	}
}

class SequencerLine {
	static readonly wholeScript = new SequencerLine('// Whole script', 0);

	constructor(
		readonly content: string,
		readonly index: number,
	) {}
}

export class SequencerError extends Error {
	override name = 'SequencerError';

	constructor(
		readonly line: SequencerLine,
		readonly rawMessage: string,
	) {
		super(`${rawMessage}\n    at line ${line.index + 1}: ${line.content}`);
	}
}

export class SequencerAggregateError extends AggregateError {
	override name = 'SequencerAggregateError';
	declare errors: SequencerError[];

	// eslint-disable-next-line @typescript-eslint/no-useless-constructor
	constructor(
		errors: Iterable<SequencerError>,
		message?: string,
		options?: ErrorOptions,
	) {
		super(errors, message, options);
	}
}

export class SequencerAssertion extends EvalEvent {
	// eslint-disable-next-line max-params
	constructor(
		context: SequencerContext,
		readonly actualTile: string,
		readonly actual: boolean,
		readonly expected: boolean,
		readonly expectedTile?: string,
	) {
		super(context, 'assert');
	}
}

class AdmissionSet<T> extends Set<T> {
	isExcludeList = false;

	addAll(iterable: Iterable<T>) {
		for (const item of iterable) {
			this.add(item);
		}
	}

	calculateSet<R>(set: Set<R>, mapper: (input: T) => R): Set<R>;
	calculateSet(set: Set<T>): Set<T>;
	calculateSet(set: Set<unknown>, mapper: (input: T) => unknown = (i) => i) {
		const result = new Set<unknown>();
		const mapped = new Set([...this].map((i) => mapper(i)));

		for (const item of set) {
			if (mapped.has(item) !== this.isExcludeList) result.add(item);
		}

		return result;
	}
}

export class SequencerContext extends EvalContext {
	hasAssertions = false;
	override yieldedTiles = new Set<QuadTreeNode>();
	index = 0;
	readonly labels = new Map<string, number>();
	readonly publicLabels = new Map<string, number>();
	readonly tileNames = new Map<QuadTreeNode, string>();
	readonly monitoredTiles: readonly QuadTreeNode[];
	protected override readonly _undoStack = new RingBuffer<never>(0);
	private _monitoring = false;
	private readonly _tiles = new Map<string, Point>();
	private readonly _monitored = new AdmissionSet<string>();
	private readonly _ast: SequencerNode[] = [];
	private readonly _errors: SequencerError[] = [];

	private _status: 'running' | 'yielded' | 'done' | 'initialized' =
		'initialized';

	get status() {
		return this._status;
	}

	set status(value) {
		this._status = value;
		evalEvents.dispatchEvent(new EvalEvent(this, value));
	}

	constructor(tree: QuadTree) {
		super(tree);

		const lines = tree.sequence
			.split('\n')
			.map(
				(i, index) =>
					new SequencerLine(i.trim().replaceAll(/\s+/g, ' '), index),
			)
			.filter((i) => i.content);

		this._populate(lines);

		if (![...this.labels.values()].includes(0)) {
			this.labels.set('', 0);
		}

		for (const [label, index] of this.labels) {
			if (!label.startsWith('_')) {
				this.publicLabels.set(label, index);
			}
		}

		this._validate();

		if (this._errors.length > 0) {
			throw new SequencerAggregateError(this._errors, 'Error while parsing');
		}

		this.monitoredTiles = [
			...this._monitored.calculateSet(this._graph.map.ioTiles, (i) =>
				this.getTile(i),
			),
		];

		for (const tile of this._graph.map.ioTiles) {
			const {x, y} = tile.bounds.topLeft;
			this.tileNames.set(tile, `(${x},${y})`);
		}

		for (const [name, point] of this._tiles) {
			const tile = nonNullable(this._graph.map.getTile(point));
			this.tileNames.set(tile, name);
		}

		for (const monitored of this._monitored) {
			const tile = this.getTile(monitored);
			this.tileNames.set(tile, monitored);
		}
	}

	observe() {
		const observation: boolean[] = [];

		for (const tile of this.monitoredTiles) {
			observation.push(this.output(tile));
		}

		return observation;
	}

	getTile(name: string) {
		return nonNullable(
			this._graph.map.getTile(nonNullable(this._tiles.get(name))),
		);
	}

	protected override _step() {
		if (this.status !== 'running') return;
		this.yieldedTiles.clear();

		if (this.tickType !== undefined) {
			super._step();
			return;
		}

		const node = this._ast[this.index++];

		if (!node) {
			this.status = 'done';
			this.stop();
			return;
		}

		const {args} = node;

		// Cast safety: Validated at construction.
		switch (args[0]) {
			case operationJump: {
				this.index = this.labels.get(args[1])!;
				break;
			}

			case operationSet: {
				const dest = this._graph.map.getTile(this._tiles.get(args[1])!)!;
				const src = this._graph.map.getTile(this._tiles.get(args[2])!)!;
				this.input(dest, this.output(src));
				break;
			}

			case operationSetConstant: {
				const dest = this._graph.map.getTile(this._tiles.get(args[1])!)!;
				this.input(dest, args[2]);
				break;
			}

			case operationAssert: {
				const actual = this._graph.map.getTile(this._tiles.get(args[1])!)!;
				const expected = this._graph.map.getTile(this._tiles.get(args[2])!)!;
				evalEvents.dispatchEvent(
					new SequencerAssertion(
						this,
						args[1]!,
						this.output(actual),
						this.output(expected),
						args[2]!,
					),
				);
				break;
			}

			case operationAssertConstant: {
				const actual = this._graph.map.getTile(this._tiles.get(args[1])!)!;
				evalEvents.dispatchEvent(
					new SequencerAssertion(this, args[1]!, this.output(actual), args[2]!),
				);
				break;
			}

			case operationYieldInclude: {
				this.status = 'yielded';
				const tiles = new AdmissionSet(args.slice(1));
				this.yieldedTiles = tiles.calculateSet(this._graph.inputTiles, (i) =>
					this.getTile(i),
				);
				break;
			}

			case operationYieldExclude: {
				this.status = 'yielded';
				const tiles = new AdmissionSet(args.slice(1));
				tiles.isExcludeList = true;
				this.yieldedTiles = tiles.calculateSet(this._graph.inputTiles, (i) =>
					this.getTile(i),
				);
				break;
			}

			case operationNext: {
				this.tickType = 'tickForward';
				this.targetTick = args[1];
				break;
			}

			case operationNextStable: {
				this.tickType = 'tickForward';
				this.targetTick = -1n;
				break;
			}

			// No default
		}
	}

	private _populate(lines: SequencerLine[]) {
		for (const line of lines) {
			// eslint-disable-next-line @typescript-eslint/ban-types
			let match: RegExpMatchArray | null;

			// Cast safety: Guaranteed according to the RegExp.
			if ((match = /^([_a-z]\w*) ?:$/i.exec(line.content))) {
				this._assert(
					!this.labels.has(match[1]!),
					line,
					`Duplicate label: ${match[1]!}`,
				);
				this.labels.set(match[1]!, this._ast.length);
			} else if (
				(match = /^let ([_a-z]\w*) ?\( ?([-+]?\d+)[, ]+([-+]?\d+) ?\)$/i.exec(
					line.content,
				))
			) {
				this._assert(
					!this.labels.has(match[1]!),
					line,
					`Duplicate tile: ${match[1]!}`,
				);

				const pos = new Point(BigInt(match[2]!), BigInt(match[3]!));
				const tile = this._graph.map.getTile(pos);

				this._assert(
					tile && this._graph.vertices.has(tile),
					line,
					'Point is not an IO',
				);

				this._tiles.set(match[1]!, pos);
			} else if ((match = /^([_a-z]\w*) ?= ?(0|1)$/i.exec(line.content))) {
				this._ast.push(
					new SequencerNode(
						line,
						operationSetConstant,
						match[1]!,
						match[2] === '1',
					),
				);
			} else if (
				(match = /^([_a-z]\w*) ?= ?([_a-z]\w*)$/i.exec(line.content))
			) {
				this._ast.push(
					new SequencerNode(line, operationSet, match[1]!, match[2]!),
				);
			} else if (
				(match = /^assert ([_a-z]\w*) ?== ?(0|1)$/i.exec(line.content))
			) {
				this.hasAssertions = true;
				this._ast.push(
					new SequencerNode(
						line,
						operationAssertConstant,
						match[1]!,
						match[2] === '1',
					),
				);
			} else if (
				(match = /^assert ([_a-z]\w*) ?== ?([_a-z]\w*)$/i.exec(line.content))
			) {
				this.hasAssertions = true;
				this._ast.push(
					new SequencerNode(line, operationAssert, match[1]!, match[2]!),
				);
			} else if ((match = /^goto ([_a-z]\w*)$/i.exec(line.content))) {
				this._ast.push(new SequencerNode(line, operationJump, match[1]!));
			} else if ((match = /^monitor ([_\w, ]+)$/i.exec(line.content))) {
				this._assert(
					!this._monitoring,
					line,
					'Overwriting the previous declaration',
				);

				const list = Array.from(match[1]!.matchAll(/[_a-z]\w*/gi), ([i]) => i);

				for (const tile of list) {
					this._assertTile(tile, line);
				}

				this._monitored.addAll(list);
				this._monitoring = true;
			} else if ((match = /^monitor ?\* ?([_\w, ]*)$/i.exec(line.content))) {
				this._assert(
					!this._monitoring,
					line,
					'Overwriting the previous declaration',
				);

				const list = Array.from(match[1]!.matchAll(/[_a-z]\w*/gi), ([i]) => i);

				for (const tile of list) {
					this._assertTile(tile, line);
				}

				this._monitored.isExcludeList = true;
				this._monitored.addAll(list);
				this._monitoring = true;
			} else if ((match = /^yield ([_\w, ]*)|yield$/i.exec(line.content))) {
				const nodes = Array.from(
					match[1]?.matchAll(/[_a-z]\w*/gi) ?? [],
					([i]) => i,
				);
				this._ast.push(
					new SequencerNode(line, operationYieldInclude, ...nodes),
				);
			} else if ((match = /^yield ?\* ?([_\w, ]*)$/i.exec(line.content))) {
				const nodes = Array.from(match[1]!.matchAll(/[_a-z]\w*/gi), ([i]) => i);
				this._ast.push(
					new SequencerNode(line, operationYieldExclude, ...nodes),
				);
			} else if ((match = /^continue ?(\d+)$/i.exec(line.content))) {
				this._ast.push(
					new SequencerNode(line, operationNext, BigInt(match[1]!)),
				);
			} else if ((match = /^continue$/i.exec(line.content))) {
				this._ast.push(new SequencerNode(line, operationNextStable));
			} else {
				this._errors.push(new SequencerError(line, 'Invalid syntax'));
			}
		}
	}

	private _assert(condition: unknown, line: SequencerLine, message: string) {
		if (!condition) {
			this._errors.push(new SequencerError(line, message));
		}
	}

	private _assertTile(tile: string, line: SequencerLine) {
		this._assert(this._tiles.has(tile), line, `Unknown tile ${tile}`);
	}

	private _assertInput(tile: string, line: SequencerLine) {
		this._assertTile(tile, line);

		try {
			this._assert(
				this._graph.inputTiles.has(this.getTile(tile)),
				line,
				`Tile ${tile} is not an input`,
			);
		} catch {}
	}

	private _assertOutput(tile: string, line: SequencerLine) {
		this._assertTile(tile, line);

		try {
			this._assert(
				!this._graph.inputTiles.has(this.getTile(tile)),
				line,
				`Tile ${tile} is not an output`,
			);
		} catch {}
	}

	private _validate() {
		assert(this.labels.size > 0);

		this._assert(
			this.publicLabels.size > 0,
			SequencerLine.wholeScript,
			'All labels are private',
		);

		for (const node of this._ast) {
			const {args, line} = node;

			switch (args[0]) {
				case operationJump: {
					this._assert(
						this.labels.has(args[1]),
						line,
						`Unknown label ${args[1]}`,
					);
					break;
				}

				case operationSet: {
					this._assertInput(args[1], line);
					this._assertOutput(args[2], line);
					break;
				}

				case operationAssert: {
					this._assertOutput(args[1], line);
					this._assertOutput(args[2], line);
					break;
				}

				case operationSetConstant: {
					this._assertInput(args[1], line);
					break;
				}


				case operationAssertConstant: {
					this._assertOutput(args[1], line);
					break;
				}

				case operationYieldInclude:
				case operationYieldExclude: {
					for (const tile of args.slice(1)) {
						this._assertInput(tile, line);
					}

					break;
				}

				case operationNext:
				case operationNextStable: {
					break;
				}

				// No default
			}
		}
	}
}
