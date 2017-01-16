import {registerListeners, keysDown} from './util/inputter';
import keyCodes from './util/keyCodes';
import {degreesToRadians, calcVectorRadians} from './util/math';

const WIDTH = 320;
const HEIGHT = 240;
const PLANE_SIDE_LENGTH = 20;

const ABS_MAX_ANGLE_DEG = 10;
const MIN_ANGLE = degreesToRadians(ABS_MAX_ANGLE_DEG);
const MAX_ANGLE = degreesToRadians(180 - ABS_MAX_ANGLE_DEG);

const ROTATION_SPEED = degreesToRadians(180);

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
      speed: 100,
      angle: MIN_ANGLE,
    };

    this.blocks = [
      {x: 0, y: 100, width: 160, height: 40}
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

    if (this.plane.angle > MAX_ANGLE) {
      this.plane.angle = MAX_ANGLE;
    }

    if (this.plane.angle < MIN_ANGLE) {
      this.plane.angle = MIN_ANGLE;
    }

    const {x, y} = calcVectorRadians(this.plane.speed * dt, this.plane.angle);
    this.plane.x += x;
    this.plane.y += y;

    // TODO: Clean up platforms no longer on screen

    // TODO: Spawn more platforms
  }
}

function drawPlane(ctx: CanvasRenderingContext2D, plane: Plane) {
  // drawing the plane works like this:
  // 1. move to center of plane
  // 2. draw equillateral triangle around center
  // 3. rotate by `plane.angle`

  ctx.save();
  ctx.translate(plane.x, plane.y);
  ctx.rotate(plane.angle);

  ctx.beginPath();
  ctx.moveTo(-PLANE_SIDE_LENGTH / 2, -PLANE_SIDE_LENGTH / 2);
  ctx.lineTo(-PLANE_SIDE_LENGTH / 2, PLANE_SIDE_LENGTH / 2);
  ctx.lineTo(PLANE_SIDE_LENGTH / 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function draw(state: State, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'white';

  // Draw platforms + plane (which scroll)
  ctx.save();
  ctx.translate(0, -(state.plane.y - 80));

  for (let block of state.blocks) {
    ctx.fillRect(block.x, block.y, block.width, block.height);
  }

  drawPlane(ctx, state.plane);

  ctx.restore();

  // Draw walls
  ctx.fillRect(0, 0, 20, HEIGHT);
  ctx.fillRect(WIDTH - 20, 0, 20, HEIGHT);

  // TODO: un-translate for HUD
}

let then = Date.now();
function runLoop(state: State, canvas: HTMLCanvasElement) {
  requestAnimationFrame(() => {
    const now = Date.now();
    const dt = now - then;
    then = now;

    state.update(dt / 1000, keysDown);
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