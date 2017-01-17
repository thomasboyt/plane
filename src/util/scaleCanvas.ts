export default function scaleCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const clientWidth = (<HTMLElement>canvas.parentNode).clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  let pixelRatio = 1;

  if (window.devicePixelRatio) {
    pixelRatio = window.devicePixelRatio;
  }

  // canvas width and height should be the pixel-scaled size
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  // the css styling should be the "logical" size
  canvas.style.width = `${width}px`;
  canvas.style.maxHeight = `${height}px`;

  canvas.getContext('2d')!.scale(pixelRatio, pixelRatio);
}