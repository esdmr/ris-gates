import type {EvalGraph, Evaluator} from './eval.js';
import {setToggle} from './map-and-set.js';

export class JsEvaluator implements Evaluator {
	private readonly _enabled;

	constructor(readonly graph: EvalGraph) {
		this._enabled = new Set(graph.activeVertices);
	}

	input(vertex: number, value: boolean): void {
		setToggle(this._enabled, vertex, value);
	}

	output(vertex: number): boolean {
		return this._enabled.has(vertex);
	}

	load(source: ReadonlySet<number>): void {
		this._enabled.clear();

		for (const item of source) {
			this._enabled.add(item);
		}
	}

	save(target: Set<number>): void {
		for (const item of this._enabled) {
			target.add(item);
		}
	}

	tickForward() {
		let anythingUpdated = false;

		// Make sure this loop terminates. If you created a loop with an IO
		// tile, it would have produced a sub-tick pulse and cause this loop to
		// never end. Since the worst-case scenario for a non-looping circuit is
		// equal to the number of positive edges, we will terminate at that
		// point, plus one more for good measure. (Of course, this scenario
		// implies that there will never be a stable tick, which technically is
		// not supported.)
		for (
			let updated = true, count = this.graph.positiveEdges.size;
			updated && count >= 0;
			count--
		) {
			updated = false;

			for (const [target, sources] of this.graph.positiveEdges) {
				let value = false;

				for (const source of sources) {
					value = this._enabled.has(source);
					if (value) break;
				}

				if (this._enabled.has(target) !== value) {
					if (import.meta.env.DEV) console.log('+', target, value, sources);
					setToggle(this._enabled, target, value);
					updated = true;
					anythingUpdated = true;
				}
			}
		}

		// Since only Conjoins and Disjoins can interact with other tiles, two
		// negative edges can never connect to each other. Therefore, no need to
		// loop multiple times here.
		for (const [target, sources] of this.graph.negativeEdges) {
			let value = false;

			for (const source of sources) {
				value = this._enabled.has(source);
				if (value) break;
			}

			if (this._enabled.has(target) === value) {
				if (import.meta.env.DEV) console.log('-', target, !value, sources);
				setToggle(this._enabled, target, !value);
				anythingUpdated = true;
			}
		}

		return anythingUpdated;
	}
}
