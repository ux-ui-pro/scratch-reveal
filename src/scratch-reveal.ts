import Brush from './internal/Brush';
import { loadImage, rafThrottle } from './internal/utils';
import type { ScratchRevealOptions } from './options';
import DEFAULT_CSS_TEXT from './scratch-reveal.css?raw';

export const scratchRevealCssText = DEFAULT_CSS_TEXT;

function supportsAdoptedStyleSheets(root: ShadowRoot): boolean {
  return 'adoptedStyleSheets' in root;
}

function makeConstructableSheet(cssText: string): CSSStyleSheet | null {
  if (typeof CSSStyleSheet === 'undefined') return null;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    return sheet;
  } catch {
    return null;
  }
}

const DEFAULT_STYLESHEET = makeConstructableSheet(DEFAULT_CSS_TEXT);

type ScratchRevealInit = Partial<ScratchRevealOptions>;

const DEFAULTS: ScratchRevealOptions = {
  width: 300,
  height: 300,
  brushSrc: '',
  imageMaskSrc: '',
  imageBackgroundSrc: '',
  brushSize: 0,
  percentToFinish: 60,
};

class ScratchReveal {
  readonly config: ScratchRevealOptions;
  readonly ctx: CanvasRenderingContext2D;
  readonly container: HTMLElement;
  private _canvas: HTMLCanvasElement;
  private brush: Brush;
  private maskImage?: HTMLImageElement;
  private backgroundImage?: HTMLImageElement;
  private brushImage?: HTMLImageElement;
  private backgroundEl?: HTMLImageElement;
  private brushSize = 0;
  private percent = 0;
  private done = false;
  private completing = false;
  private destroyed = false;
  private lastProgressEmitMs = 0;
  private removeListeners?: () => void;

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  constructor(selector: string | HTMLElement, options: ScratchRevealInit = {}) {
    this.config = { ...DEFAULTS, ...options };
    this.container = (
      typeof selector === 'string' ? document.querySelector(selector) : selector
    ) as HTMLElement;

    if (!this.container) {
      throw new Error('ScratchReveal: container not found');
    }

    this._canvas = this.createCanvas(this.config.width, this.config.height);
    this.ctx = this._canvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;
    this.brush = new Brush(this.ctx, 0, 0);
    this.brushSize = this.config.brushSize;
    this.container.appendChild(this._canvas);
  }

  async init(): Promise<this> {
    if (!this.config.brushSrc) {
      throw new Error('ScratchReveal: "brushSrc" is required');
    }
    if (!this.config.imageMaskSrc) {
      throw new Error('ScratchReveal: "imageMaskSrc" is required');
    }
    if (!this.config.imageBackgroundSrc) {
      throw new Error('ScratchReveal: "imageBackgroundSrc" is required');
    }

    const [brush, mask, background] = await Promise.all([
      loadImage(this.config.brushSrc),
      loadImage(this.config.imageMaskSrc),
      loadImage(this.config.imageBackgroundSrc),
    ]);

    if (this.destroyed) return this;

    this.brushImage = brush;
    this.maskImage = mask;
    this.backgroundImage = background;

    this.drawMask();
    this.setBackground();
    this.bindEvents();
    return this;
  }

  destroy() {
    this.destroyed = true;
    this.removeListeners?.();
  }

  getPercent(): number {
    return this.percent;
  }

  private createCanvas(width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.className = 'sr__canvas';
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    return canvas;
  }

  resize(width: number, height: number) {
    if (this.destroyed) return;
    if (this.done) return;
    if (width <= 0 || height <= 0) return;
    if (this._canvas.width === width && this._canvas.height === height) return;

    this._canvas.width = width;
    this._canvas.height = height;

    this.percent = 0;
    this.ctx.globalCompositeOperation = 'source-over';
    this.drawMask();
  }

  setBrushSize(size: number) {
    if (this.destroyed) return;
    if (!Number.isFinite(size) || size < 0) return;
    this.brushSize = size;
  }

  private bindEvents() {
    const PROGRESS_EMIT_INTERVAL_MS = 120;

    const updatePercentAndMaybeFinishThrottled = rafThrottle(
      (event: PointerEvent, onPointerMove: (event: PointerEvent) => void) => {
        this.percent = this.updatePercent();
        const now = performance.now();
        if (
          !this.lastProgressEmitMs ||
          now - this.lastProgressEmitMs >= PROGRESS_EMIT_INTERVAL_MS
        ) {
          this.lastProgressEmitMs = now;
          this.config.onProgress?.(this.percent);
        }
        this.finish(event, onPointerMove);
      },
    );

    const onPointerMove = rafThrottle((event: PointerEvent) => {
      this.updatePosition(event);
      this.scratch();
      updatePercentAndMaybeFinishThrottled(event, onPointerMove);
    });

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      this.updatePosition(event);
      this.scratch();
      this._canvas.setPointerCapture(event.pointerId);
      this._canvas.addEventListener('pointermove', onPointerMove);

      this.percent = this.updatePercent();
      this.config.onProgress?.(this.percent);
      this.finish(event, onPointerMove);
    };

    const onPointerUp = (event: PointerEvent) => {
      this.percent = this.updatePercent();
      this.config.onProgress?.(this.percent);
      this.finish(event, onPointerMove);
    };

    this._canvas.addEventListener('pointerdown', onPointerDown);
    this._canvas.addEventListener('pointerup', onPointerUp);
    this._canvas.addEventListener('pointerleave', onPointerUp);

    this.removeListeners = () => {
      this._canvas.removeEventListener('pointerdown', onPointerDown);
      this._canvas.removeEventListener('pointerup', onPointerUp);
      this._canvas.removeEventListener('pointerleave', onPointerUp);
      this._canvas.removeEventListener('pointermove', onPointerMove);
    };
  }

  private updatePosition(event: PointerEvent) {
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = rect.width ? this._canvas.width / rect.width : 1;
    const scaleY = rect.height ? this._canvas.height / rect.height : 1;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    this.brush.updateMousePosition(x, y);
  }

  private drawMask() {
    if (!this.maskImage) return;
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this.ctx.drawImage(this.maskImage, 0, 0, this._canvas.width, this._canvas.height);
  }

  private setBackground() {
    if (this.destroyed) return;
    if (!this.backgroundImage) return;

    if (!this.container.contains(this._canvas)) return;

    const image = this.backgroundEl ?? document.createElement('img');
    image.src = this.backgroundImage.src;
    image.className = 'sr__bg';
    if (!image.isConnected) {
      this.container.insertBefore(image, this._canvas);
    }
    this.backgroundEl = image;
  }

  private scratch() {
    if (!this.brushImage) return;
    const effectiveBrushSize = this.brushSize > 0 ? this.brushSize : 0;
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.save();
    this.brush.brush(this.brushImage, effectiveBrushSize);
    this.ctx.restore();
  }

  private updatePercent(): number {
    const imageData = this.ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    const data = imageData.data;
    let cleared = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) cleared++;
    }
    return (cleared / (this._canvas.width * this._canvas.height)) * 100;
  }

  private finish(event?: PointerEvent, onPointerMove?: (event: PointerEvent) => void) {
    if (this.done) return;
    if (this.percent > this.config.percentToFinish) {
      this.done = true;
      this._canvas.style.pointerEvents = 'none';
      this.config.onComplete?.();
      this.playCompleteEffect();

      if (event && onPointerMove) {
        try {
          this._canvas.releasePointerCapture(event.pointerId);
        } catch {
          // ignore
        }
        this._canvas.removeEventListener('pointermove', onPointerMove);
      }
    }
  }

  private playCompleteEffect() {
    if (this.destroyed) return;
    if (this.completing) return;
    this.completing = true;

    const duration = 350;
    const easing = 'ease-out';

    this._canvas.style.transition = `opacity ${duration}ms ${easing}`;

    if (!this._canvas.style.opacity) this._canvas.style.opacity = '1';

    requestAnimationFrame(() => {
      this._canvas.style.opacity = '0';
      window.setTimeout(() => {
        if (this.destroyed) return;
        this.clear();
      }, duration);
    });
  }

  clear() {
    this.ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }
}

export function registerScratchRevealElement(tagName = 'scratch-reveal') {
  if (typeof window === 'undefined' || !('customElements' in window)) return;
  if (customElements.get(tagName)) return;

  function parseBrushSizeToPx(
    value: string | null,
    canvasWidth: number,
    canvasHeight: number,
    fallbackPx: number,
  ): number {
    if (!value) return fallbackPx;
    const v = value.trim();
    if (!v) return fallbackPx;

    const rawNumber = Number.parseFloat(
      v.endsWith('%') ? v.slice(0, -1) : v.endsWith('px') ? v.slice(0, -2) : v,
    );
    if (!Number.isFinite(rawNumber)) return fallbackPx;

    if (v.endsWith('px')) {
      return Math.max(0, rawNumber);
    }

    const basis = Math.min(canvasWidth, canvasHeight);
    return Math.max(0, (basis * rawNumber) / 100);
  }

  class ScratchRevealElement extends HTMLElement {
    private instance?: ScratchReveal;
    private container: HTMLDivElement;
    private styleEl: HTMLStyleElement | null = null;
    private rebuildScheduled = false;
    private resizeObserver?: ResizeObserver;
    private lastErrorMessage: string | null = null;

    static get observedAttributes() {
      return [
        'width',
        'height',
        'complete-percent',
        'brush-src',
        'brush-size',
        'mask-src',
        'background-src',
      ];
    }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      if (supportsAdoptedStyleSheets(shadow) && DEFAULT_STYLESHEET) {
        shadow.adoptedStyleSheets = [DEFAULT_STYLESHEET];
      } else {
        this.styleEl = document.createElement('style');
        this.styleEl.textContent = DEFAULT_CSS_TEXT;
        shadow.append(this.styleEl);
      }
      this.container = document.createElement('div');
      this.container.className = 'sr';
      shadow.append(this.container);
    }

    connectedCallback() {
      this.scheduleRebuild();
    }

    disconnectedCallback() {
      this.instance?.destroy();
      this.instance = undefined;
      this.resizeObserver?.disconnect();
      this.resizeObserver = undefined;
    }

    attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
      if (oldValue === newValue) return;
      this.scheduleRebuild();
    }

    private scheduleRebuild() {
      if (this.rebuildScheduled) return;
      this.rebuildScheduled = true;
      queueMicrotask(() => {
        this.rebuildScheduled = false;
        if (!this.isConnected) return;
        this.rebuild();
      });
    }

    private rebuild() {
      this.container.replaceChildren();
      this.instance?.destroy();

      const hasWidthAttr = this.hasAttribute('width');
      const hasHeightAttr = this.hasAttribute('height');

      const hostRect = this.getBoundingClientRect();
      const autoWidth = Math.round(hostRect.width);
      const autoHeight = Math.round(hostRect.height);

      const width = hasWidthAttr ? Number(this.getAttribute('width')) : autoWidth || DEFAULTS.width;
      const height = hasHeightAttr
        ? Number(this.getAttribute('height'))
        : autoHeight || DEFAULTS.height;
      const percentToFinish = Number(
        this.getAttribute('complete-percent') ?? DEFAULTS.percentToFinish,
      );
      const brushSrc = (this.getAttribute('brush-src') ?? '').trim();
      const brushSize = parseBrushSizeToPx(
        this.getAttribute('brush-size'),
        width,
        height,
        DEFAULTS.brushSize,
      );
      const imageMaskSrc = (this.getAttribute('mask-src') ?? '').trim();
      const imageBackgroundSrc = (this.getAttribute('background-src') ?? '').trim();

      const missing: string[] = [];
      if (!brushSrc) missing.push('brush-src');
      if (!imageMaskSrc) missing.push('mask-src');
      if (!imageBackgroundSrc) missing.push('background-src');

      if (missing.length) {
        const message = `ScratchReveal: missing required attribute(s): ${missing.join(', ')}`;
        this.renderError(message);
        return;
      }

      if (hasWidthAttr) this.container.style.width = `${width}px`;
      else this.container.style.width = '100%';
      if (hasHeightAttr) this.container.style.height = `${height}px`;
      else this.container.style.height = '100%';

      this.instance = new ScratchReveal(this.container, {
        width,
        height,
        percentToFinish,
        brushSrc,
        brushSize,
        imageMaskSrc,
        imageBackgroundSrc,
        onProgress: (percent) => {
          this.dispatchEvent(new CustomEvent('progress', { detail: { percent } }));
        },
        onComplete: () => {
          this.dispatchEvent(new CustomEvent('complete', { detail: { percent: 100 } }));
        },
      });

      this.instance.init().catch((err) => {
        const message = err instanceof Error ? err.message : 'ScratchReveal: init failed';
        this.renderError(message);
      });

      const needsAutoSize = !hasWidthAttr || !hasHeightAttr;
      if (needsAutoSize && 'ResizeObserver' in window) {
        this.resizeObserver?.disconnect();
        this.resizeObserver = new ResizeObserver(() => {
          if (this.hasAttribute('width') && this.hasAttribute('height')) {
            this.resizeObserver?.disconnect();
            this.resizeObserver = undefined;
            return;
          }
          const rect = this.getBoundingClientRect();
          const nextW = Math.round(rect.width);
          const nextH = Math.round(rect.height);
          this.instance?.resize(nextW, nextH);
          const nextBrushSize = parseBrushSizeToPx(
            this.getAttribute('brush-size'),
            nextW,
            nextH,
            DEFAULTS.brushSize,
          );
          this.instance?.setBrushSize(nextBrushSize);
        });
        this.resizeObserver.observe(this);
      } else {
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
      }
    }

    private renderError(message: string) {
      this.instance?.destroy();
      this.instance = undefined;

      if (this.lastErrorMessage !== message) {
        this.lastErrorMessage = message;
        this.dispatchEvent(new CustomEvent('error', { detail: { message } }));
      }
    }
  }

  customElements.define(tagName, ScratchRevealElement);
}

export function installScratchReveal(app: {
  config: { globalProperties: Record<string, unknown> };
}) {
  registerScratchRevealElement();
  app.config.globalProperties.$scratchReveal = true;
}
