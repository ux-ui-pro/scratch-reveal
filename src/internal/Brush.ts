export default class Brush {
  readonly ctx: CanvasRenderingContext2D;
  public mouseX: number;
  public mouseY: number;

  constructor(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number) {
    this.ctx = ctx;
    this.mouseX = mouseX;
    this.mouseY = mouseY;
  }

  updateMousePosition(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  brush(img: HTMLImageElement, size = 0) {
    if (!img) {
      return;
    }

    const angle = Math.atan2(this.mouseY, this.mouseX);

    this.ctx.save();
    this.ctx.translate(this.mouseX, this.mouseY);
    this.ctx.rotate(angle);

    if (size > 0) {
      const width = size;
      const height = size * (img.height / img.width);

      this.ctx.drawImage(img, -(width / 2), -(height / 2), width, height);
    } else {
      this.ctx.drawImage(img, -(img.width / 2), -(img.height / 2));
    }

    this.ctx.restore();
  }
}
