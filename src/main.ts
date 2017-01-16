import {registerListeners, keysDown} from './util/inputter';
import keyCodes from './util/keyCodes';
import {degreesToRadians} from './util/math';

const WIDTH = 320;
const HEIGHT = 240;
const PLANE_SIDE_LENGTH = 12;
const MAX_ANGLE = degreesToRadians(30);
const ROTATION_SPEED = degreesToRadians(10);

interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Plane {
  x: number;
  y: number;
  speed: number;
  angle: number;
}

class State {
  blocks: Block[] = [];
  plane: Plane;

  constructor() {
    this.plane = {
      x: 20,
      y: 20,
      speed: 0,
      angle: 0,
    };

    this.blocks = [
      {x: 0, y: 100, width: 120, height: 40}
    ];
  }

  update(dt: number, keysDown: Set<number>) {
    if (keysDown.has(keyCodes.A)) {
      // turn left
      this.plane.angle -= ROTATION_SPEED * dt;
    }

    if (keysDown.has(keyCodes.D)) {
      // turn right
      this.plane.angle += ROTATION_SPEED * dt;
    }
  }
}

function drawPlane(ctx: CanvasRenderingContext2D, plane: Plane) {
  // drawing the plane works like this:
  // 1. move to center of plane
  // 2. draw equillateral triangle around center
  // 3. rotate by `plane.angle`

  ctx.translate(plane.x, plane.y);
  ctx.rotate(plane.angle);

  ctx.moveTo(-PLANE_SIDE_LENGTH / 2, -PLANE_SIDE_LENGTH / 2);
  ctx.lineTo(0, PLANE_SIDE_LENGTH / 2);
  ctx.lineTo(PLANE_SIDE_LENGTH / 2, -PLANE_SIDE_LENGTH / 2);
  ctx.closePath();
  ctx.fill();

  ctx.translate(-plane.x, -plane.y);
  ctx.rotate(-plane.angle);
}

function draw(state: State, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'white';

  // TODO: Translate by plane Y - offset

  for (let block of state.blocks) {
    ctx.fillRect(block.x, block.y, block.width, block.height);
  }

  drawPlane(ctx, state.plane);

  // TODO: un-translate for HUD
}

let then = Date.now();
function runLoop(state: State, canvas: HTMLCanvasElement) {
  requestAnimationFrame(() => {
    const now = Date.now();
    const dt = now - then;
    then = now;

    state.update(dt * 1000, keysDown);
    draw(state, canvas);

    runLoop(state, canvas);
  });
}

function main() {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  registerListeners();

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const state = new State();

  runLoop(state, canvas);
}

main();