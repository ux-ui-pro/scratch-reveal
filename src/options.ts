export interface ScratchRevealOptions {
  width: number;
  height: number;
  imageMaskSrc: string;
  imageBackgroundSrc: string;
  brushSrc: string;
  /**
   * Brush width in CSS pixels. Use `0` to keep the brush image natural size.
   */
  brushSize: number;
  percentToFinish: number;
  enabledPercentUpdate: boolean;
  onProgress?: (percent: number) => void;
  onComplete?: () => void;
}
