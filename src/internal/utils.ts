export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image ${src} failed to load`));
    image.src = src;
  });
}

export function rafThrottle<Args extends unknown[]>(
  fn: (...args: Args) => void,
): (...args: Args) => void {
  let frame = 0;
  const throttled = ((...args: Args) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      fn(...args);
    });
  }) as (...args: Args) => void;
  return throttled;
}

export function getOffset(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
  };
}
