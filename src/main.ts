import * as SAT from 'sat';

import {registerListeners, keysDown} from './util/inputter';
import keyCodes from './util/keyCodes';
import {degreesToRadians, calcVectorRadians} from './util/math';

const WIDTH = 320;
const HEIGHT = 240;
const PLANE_SIDE_LENGTH = 20;
const CAMERA_OFFSET = 80;
const WALL_WIDTH = 20;

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
  dead: boolean;

  blocks: Block[];
  plane: Plane;

  points: number;

  constructor() {
    this.reset();
  }

  reset() {
    this.dead = false;

    this.blocks = [
      {x: 0, y: 100, width: 160, height: 40},
      {x: WIDTH - 160, y: 200, width: 160, height: 40},
      {x: 0, y: 300, width: 160, height: 40},
    ];

    this.plane = {
      x: 40,
      y: 20,
      speed: 100,
      angle: MIN_ANGLE,
    };

    this.points = 0;
  }

  update(dt: number, keysDown: Set<number>) {
    if (this.dead) {
      if (keysDown.has(keyCodes.SPACE)) {
        this.reset();
      }

      return;
    }

    /*
     * Handle input
     */

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

    /*
     * Update plane position
     */

    const {x, y} = calcVectorRadians(this.plane.speed * dt, this.plane.angle);
    this.plane.x += x;
    this.plane.y += y;

    /*
     * Test collisions
     */

    const planeCollider = new SAT.Polygon(new SAT.Vector(this.plane.x, this.plane.y), [
      new SAT.Vector(-PLANE_SIDE_LENGTH / 2, -PLANE_SIDE_LENGTH / 2),
      new SAT.Vector(-PLANE_SIDE_LENGTH / 2, PLANE_SIDE_LENGTH / 2),
      new SAT.Vector(PLANE_SIDE_LENGTH / 2, 0),
    ]);
    planeCollider.rotate(this.plane.angle);

    const blockColliders = this.blocks.map((block) => {
      return new SAT.Box(new SAT.Vector(block.x, block.y), block.width, block.height).toPolygon();
    });

    let resp: SAT.Response;
    let collided: boolean = false;
    for (let blockCollider of blockColliders) {
      resp = new SAT.Response();
      collided = SAT.testPolygonPolygon(planeCollider, blockCollider);
      if (collided) {
        break;
      }
    }

    if (!collided) {
      // check collision with walls
      for (let point of planeCollider.calcPoints) {
        const x = point.x + planeCollider.pos.x;
        if (x < WALL_WIDTH || x > WIDTH - WALL_WIDTH) {
          collided = true;
        }
      }
    }

    if (collided) {
      this.dead = true;
      return;
    }

    /*
     * Update blocks
     */

    // Clean up offscreen blocks
    this.blocks = this.blocks.filter((block) => {
      const cameraTop = this.plane.y - CAMERA_OFFSET;
      const blockBottom = block.y + block.height;
      return cameraTop <= blockBottom;
    });

    // TODO: Spawn more blocks using some logic!!

    // TODO: Increment points when player passes a block
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
  ctx.translate(0, -(state.plane.y - CAMERA_OFFSET));

  for (let block of state.blocks) {
    ctx.fillRect(block.x, block.y, block.width, block.height);
  }

  drawPlane(ctx, state.plane);

  ctx.restore();

  // Draw walls
  ctx.fillRect(0, 0, WALL_WIDTH, HEIGHT);
  ctx.fillRect(WIDTH - WALL_WIDTH, 0, WALL_WIDTH, HEIGHT);

  // TODO: Draw HUD
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
  const canvas = document.querySelector('canvas')!;
  registerListeners();

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const state = new State();

  runLoop(state, canvas);
}

main();