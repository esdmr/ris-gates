import init, {next_frame} from '@internal/eval-wasm';
import type {EvalGraph, Evaluator} from './eval.js';
import {assert} from './assert.js';

const {memory} = await init();
const maxAlign = 16;
const maxU32 = 0xff_ff_ff_ff;
const edgeSize = 4;
const pageSize = 0x1_00_00;
const safeInitialAddress = 2048;
const positiveEdge = 1;
const negativeEdge = 2;

let vertices: Uint8Array;
let edgeTypes: Uint8Array;
let edges: Uint32LeArray;

function align(address: number) {
	const currentAlign = address % maxAlign;
	return currentAlign ? address + maxAlign - currentAlign : address;
}

class Uint32LeArray {
	readonly data: DataView;

	constructor(
		readonly buffer: ArrayBuffer,
		readonly byteOffset: number,
		readonly length: number,
	) {
		this.data = new DataView(
			buffer,
			byteOffset,
			length * Uint32Array.BYTES_PER_ELEMENT,
		);
	}

	get(index: number) {
		return this.data.getUint32(index * Uint32Array.BYTES_PER_ELEMENT, true);
	}

	set(index: number, value: number) {
		this.data.setUint32(index * Uint32Array.BYTES_PER_ELEMENT, value, true);
	}
}

// eslint-disable-next-line @internal/no-object-literals
export const wasmEvaluator: Evaluator = {
	graph: undefined,

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

	const edgeTypesAddress = address;
	address = align(address + verticesLength);

	const edgesAddress = address;
	const edgesLength = verticesLength * edgeSize;
	address = align(address + edgesLength * Uint32Array.BYTES_PER_ELEMENT);

	const bytesDelta = address - memory.buffer.byteLength;

	if (bytesDelta > 0) {
		memory.grow(Math.ceil(bytesDelta / pageSize));
	}

	vertices = new Uint8Array(memory.buffer, verticesAddress, verticesLength);
	edgeTypes = new Uint8Array(memory.buffer, edgeTypesAddress, verticesLength);
	edges = new Uint32LeArray(memory.buffer, edgesAddress, edgesLength);

	wasmEvaluator.load(graph.activeVertices);
	edgeTypes.fill(0);

	for (const [target, sources] of graph.positiveEdges) {
		assert(sources.size <= 4);
		assert(edgeTypes[target] === 0);
		const [a = maxU32, b = maxU32, c = maxU32, d = maxU32] = sources;
		edgeTypes[target] = positiveEdge;

		for (const [index, source] of [a, b, c, d].entries()) {
			edges.set(target * edgeSize + index, source);
		}
	}

	for (const [target, sources] of graph.negativeEdges) {
		assert(sources.size <= 4);
		assert(edgeTypes[target] === 0);
		const [a = maxU32, b = maxU32, c = maxU32, d = maxU32] = sources;
		edgeTypes[target] = negativeEdge;

		for (const [index, source] of [a, b, c, d].entries()) {
			edges.set(target * edgeSize + index, source);
		}
	}
}
