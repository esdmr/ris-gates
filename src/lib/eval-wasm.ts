import init, {next_frame} from 'ris-gates-eval';
import type {EvalGraph, Evaluator} from './eval.js';
import {assert} from './assert.js';

const {memory} = await init();
const maxAlign = 16;
const maxU32 = 0xff_ff_ff_ff;
const edgeSize = 4;
const pageSize = 0x1_00_00;
const safeInitialAddress = 2048;

let vertices: Uint8Array;
let edges: Uint32Array;
let edgeTypes: Uint8Array;

function align(address: number) {
	const currentAlign = address % maxAlign;
	return currentAlign ? address + maxAlign - currentAlign : address;
}

// eslint-disable-next-line @internal/no-object-literals
export const wasmEvaluator: Evaluator = {
	// Cast safety: This property is lazily initialized.
	graph: undefined!,

	input(vertex: number, value: boolean): void {
		vertices[vertex] = value ? 1 : 0;
	},

	output(vertex: number): boolean {
		return vertices[vertex] !== 0;
	},

	load(source: ReadonlySet<number>): void {
		vertices.fill(0);

		for (const i of source) {
			this.input(i, true);
		}
	},

	save(target: Set<number>): void {
		for (let i = 0; i < vertices.length; i++) {
			if (this.output(i)) {
				target.add(i);
			}
		}
	},

	tickForward(): boolean {
		return next_frame(
			vertices.byteOffset,
			vertices.length,
			edges.byteOffset,
			edgeTypes.byteOffset,
		);
	},
};

export function setupWasmEvaluator(graph: EvalGraph) {
	wasmEvaluator.graph = graph;
	let address = align(safeInitialAddress);

	const verticesAddress = address;
	const verticesLength = graph.verticesCount;
	address = align(address + verticesLength);

	const edgesAddress = address;
	address = align(
		address + verticesLength * edgeSize * Uint32Array.BYTES_PER_ELEMENT,
	);

	const edgeTypesAddress = address;
	address = align(address + verticesLength);

	const bytesDelta = address - memory.buffer.byteLength;

	if (bytesDelta > 0) {
		memory.grow(Math.ceil(bytesDelta / pageSize));
	}

	vertices = new Uint8Array(memory.buffer, verticesAddress, verticesLength);
	edges = new Uint32Array(
		memory.buffer,
		edgesAddress,
		verticesLength * edgeSize,
	);
	edgeTypes = new Uint8Array(memory.buffer, edgeTypesAddress, verticesLength);

	wasmEvaluator.load(graph.activeVertices);
	edges.fill(maxU32);
	edgeTypes.fill(0);

	for (const [target, sources] of graph.positiveEdges) {
		assert(sources.size <= 4);
		const [a = maxU32, b = maxU32, c = maxU32, d = maxU32] = sources;
		edges[target * edgeSize] = a;
		edges[target * edgeSize + 1] = b;
		edges[target * edgeSize + 2] = c;
		edges[target * edgeSize + 3] = d;
		edgeTypes[target] = 1;
	}

	for (const [target, sources] of graph.negativeEdges) {
		assert(sources.size <= 4);
		assert(edgeTypes[target] === 0);
		const [a = maxU32, b = maxU32, c = maxU32, d = maxU32] = sources;
		edges[target * edgeSize] = a;
		edges[target * edgeSize + 1] = b;
		edges[target * edgeSize + 2] = c;
		edges[target * edgeSize + 3] = d;
		edgeTypes[target] = 2;
	}
}
