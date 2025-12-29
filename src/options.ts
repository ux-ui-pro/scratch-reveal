export interface ScratchRevealOptions {
  width: number;
  height: number;
  imageMaskSrc: string;
  imageBackgroundSrc: string;
  brushSrc: string;
  brushSize: number;
  percentToFinish: number;
  enabledPercentUpdate: boolean;
  onProgress?: (percent: number) => void;
  onComplete?: () => void;
}
