/* eslint-disable @internal/no-object-literals, @typescript-eslint/member-ordering, @typescript-eslint/ban-types, max-params */
import {create} from '../lib/dom.js';
import {assert} from './assert.js';

export type CanvasLike = HTMLElement & {
	/**
	 * Gets or sets the height of a canvas element on a document.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/height)
	 */
	height: number;

	/**
	 * Gets or sets the width of a canvas element on a document.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/width)
	 */
	width: number;

	/**
	 * Returns an object that provides methods and properties for drawing and manipulating images and graphics on a canvas element in a document. A context object includes information about colors, line widths, fonts, and other graphic parameters that can be drawn on a canvas.
	 * @param contextId The identifier (ID) of the type of canvas to create. Internet Explorer 9 and Internet Explorer 10 support only a 2-D context using canvas.getContext("2d"); IE11 Preview also supports 3-D or WebGL context using canvas.getContext("experimental-webgl");
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/getContext)
	 */
	getContext(
		contextId: '2d',
		options?: CanvasRenderingContext2DSettings | undefined,
	): ContextLike | null;

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/toBlob) */
	toBlob(callback: BlobCallback, type?: string, quality?: any): void;
};

export type ContextLike = CanvasFillStrokeStyles &
	CanvasPathDrawingStyles &
	CanvasDrawPath &
	CanvasPath &
	CanvasRect & {
		/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/canvas) */
		readonly canvas: CanvasLike;
	};

declare global {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/naming-convention
	interface HTMLElementTagNameMap {
		'svg-canvas': SvgCanvas;
	}
}

function notImplemented(): never {
	throw new Error('Not Implemented');
}

const serializer = new XMLSerializer();

export class SvgCanvas extends HTMLElement implements CanvasLike {
	private readonly _svg = create('svg:svg', {
		width: 300,
		height: 150,
		fill: 'none',
		stroke: 'none',
	});

	/**
	 * Gets or sets the width of a canvas element on a document.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/width)
	 */
	public get width() {
		return Number(this._svg.getAttribute('width'));
	}

	public set width(value) {
		this.clear();
		this._svg.setAttribute('width', String(value));
	}

	/**
	 * Gets or sets the height of a canvas element on a document.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/height)
	 */
	public get height() {
		return Number(this._svg.getAttribute('height'));
	}

	public set height(value) {
		this.clear();
		this._svg.setAttribute('height', String(value));
	}

	override get clientWidth() {
		return this.width;
	}

	override get clientHeight() {
		return this.height;
	}

	private readonly _context = new SvgCanvasContext(this, this._svg);

	/**
	 * Returns an object that provides methods and properties for drawing and manipulating images and graphics on a canvas element in a document. A context object includes information about colors, line widths, fonts, and other graphic parameters that can be drawn on a canvas.
	 * @param contextId The identifier (ID) of the type of canvas to create. Internet Explorer 9 and Internet Explorer 10 support only a 2-D context using canvas.getContext("2d"); IE11 Preview also supports 3-D or WebGL context using canvas.getContext("experimental-webgl");
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/getContext)
	 */
	getContext() {
		return this._context;
	}

	clear() {
		if (import.meta.env.DEV) console.trace('Clearing SVG canvas');

		for (const child of this._svg.children) {
			child.remove();
		}
	}

	getText() {
		return serializer.serializeToString(this._svg);
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/toBlob) */
	toBlob() {
		throw new Error('Not implemented');
	}
}

function svgPathArc(
	x: number,
	y: number,
	radius: number,
	angle: number,
	largeArc: boolean,
	counterclockwise: boolean,
) {
	return `A${radius},${radius} 0 ${Number(largeArc)} ${Number(
		counterclockwise,
	)} ${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`;
}

export class SvgCanvasContext implements ContextLike {
	constructor(
		/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/canvas) */
		readonly canvas: SvgCanvas,
		private readonly _svg: SVGSVGElement,
	) {}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/fillStyle) */
	fillStyle: string | CanvasGradient | CanvasPattern = '#000';

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/strokeStyle) */
	strokeStyle: string | CanvasGradient | CanvasPattern = '#000';

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/createConicGradient) */
	createConicGradient(): CanvasGradient {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/createLinearGradient) */
	createLinearGradient(): CanvasGradient {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/createPattern) */
	createPattern(): CanvasPattern | null {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/createRadialGradient) */
	createRadialGradient(): CanvasGradient {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/lineCap) */
	lineCap: CanvasLineCap = 'butt';
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/lineDashOffset) */
	lineDashOffset = 0;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/lineJoin) */
	lineJoin: CanvasLineJoin = 'miter';
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/lineWidth) */
	lineWidth = 1;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/miterLimit) */
	miterLimit = 10;

	private _lineDash: number[] = [];

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/getLineDash) */
	getLineDash() {
		return this._lineDash;
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash) */
	setLineDash(segments: number[]) {
		this._lineDash = segments;
	}

	private _path = '';

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/beginPath) */
	beginPath() {
		this._path = '';
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/clip) */
	clip(fillRule?: CanvasFillRule): void;
	clip(path: Path2D, fillRule?: CanvasFillRule): void;
	clip() {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/fill) */
	fill(fillRule?: CanvasFillRule): void;
	fill(path: Path2D, fillRule?: CanvasFillRule): void;
	fill(..._: unknown[]) {
		assert(typeof _[0] !== 'object'); // Not Implemented
		// Cast safety: Derived from overload signatures.
		const fillRule = _[0] as CanvasFillRule | undefined;
		this._svg.append(
			create('svg:path', {
				...this._getFillStyle(),
				'fill-rule': fillRule,
				d: this._path,
			}),
		);
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/isPointInPath) */
	isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean;
	isPointInPath(
		path: Path2D,
		x: number,
		y: number,
		fillRule?: CanvasFillRule,
	): boolean;
	isPointInPath(): boolean {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/isPointInStroke) */
	isPointInStroke(x: number, y: number): boolean;
	isPointInStroke(path: Path2D, x: number, y: number): boolean;
	isPointInStroke(): boolean {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/stroke) */
	stroke(path?: Path2D): void {
		assert(!path); // Not Implemented
		this._svg.append(
			create('svg:path', {...this._getStrokeStyle(), d: this._path}),
		);
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/arc) */
	arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		counterclockwise = false,
	) {
		// Partially from <https://stackoverflow.com/a/48214714>.
		const fullCircle = endAngle - startAngle >= 2 * Math.PI;
		const largeArc = endAngle - startAngle > Math.PI;
		this._path += `M${x + radius * Math.cos(startAngle)},${
			y + radius * Math.sin(startAngle)
		}`;

		if (!fullCircle) {
			this._path += svgPathArc(
				x,
				y,
				radius,
				endAngle,
				largeArc,
				counterclockwise,
			);
			return;
		}

		const midwayAngle = startAngle + Math.PI;
		this._path += svgPathArc(x, y, radius, midwayAngle, false, false);
		this._path += svgPathArc(x, y, radius, startAngle, false, false);

		if (midwayAngle !== endAngle) {
			this._path += `M${x + radius * Math.cos(endAngle)},${
				y + radius * Math.sin(endAngle)
			}`;
		}
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/arcTo) */
	arcTo(): void {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/bezierCurveTo) */
	bezierCurveTo(): void {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/closePath) */
	closePath() {
		this._path += 'Z';
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/ellipse) */
	ellipse(): void {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/lineTo) */
	lineTo(x: number, y: number) {
		this._path += `L${x},${y}`;
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/moveTo) */
	moveTo(x: number, y: number) {
		this._path += `M${x},${y}`;
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/quadraticCurveTo) */
	quadraticCurveTo(): void {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/rect) */
	rect(): void {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/roundRect) */
	roundRect(): void {
		notImplemented();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/clearRect) */
	clearRect(x: number, y: number, w: number, h: number) {
		assert(!x && !y && w === this.canvas.width && h === this.canvas.height); // Only fullscreen clear supported
		this.canvas.clear();
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/fillRect) */
	fillRect(x: number, y: number, width: number, height: number) {
		this._svg.append(
			create('svg:rect', {...this._getFillStyle(), x, y, width, height}),
		);
	}

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/strokeRect) */
	strokeRect(x: number, y: number, width: number, height: number) {
		this._svg.append(
			create('svg:rect', {
				...this._getStrokeStyle(),
				x,
				y,
				width,
				height,
			}),
		);
	}

	private _getFillStyle(): Record<string, string> {
		assert(typeof this.fillStyle === 'string'); // Only string fillStyle supported
		return {
			fill: this.fillStyle === 'transparent' ? 'none' : this.fillStyle,
		};
	}

	private _getStrokeStyle(): Record<string, string> {
		assert(typeof this.strokeStyle === 'string'); // Only string strokeStyle supported
		return {
			stroke:
				this.strokeStyle === 'transparent' ? 'none' : this.strokeStyle,
			'stroke-width': `${this.lineWidth}px`,
			'stroke-linecap': this.lineCap,
			'stroke-linejoin': this.lineJoin,
			'stroke-miterlimit': String(this.miterLimit),
			'stroke-dasharray': this._lineDash.join(' ') || 'none',
			'stroke-dashoffset': String(this.lineDashOffset),
		};
	}
}
