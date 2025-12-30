export interface ScratchRevealOptions {
  width: number;
  height: number;
  imageMaskSrc: string;
  imageBackgroundSrc: string;
  brushSrc: string;
  brushSize: number;
  percentToFinish: number;
  onProgress?: (percent: number) => void;
  onComplete?: () => void;
}
