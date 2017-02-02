import * as SAT from 'sat';
import * as I from 'immutable';
import makeRecordFactory, {Record} from 'nightshirt';

import {registerListeners, keysDown} from './util/inputter';
import keyCodes from './util/keyCodes';
import {degreesToRadians, calcVectorRadians} from './util/math';
import scaleCanvas from './util/scaleCanvas';

import MusicPlayer from './music';

const WIDTH = 320;
const HEIGHT = 240;
const PLANE_SIDE_LENGTH = 20;
const CAMERA_OFFSET = 80;
const WALL_WIDTH = 20;

const ABS_MAX_ANGLE_DEG = 10;
const MIN_ANGLE = degreesToRadians(ABS_MAX_ANGLE_DEG);
const MAX_ANGLE = degreesToRadians(180 - ABS_MAX_ANGLE_DEG);

const ROTATION_SPEED = degreesToRadians(180);

enum GameState {
  Title,
  Playing,
  Dead,
};

enum BlockSide {
  Left,
  Right,
};

interface IBlock {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface IPlane {
  x: number;
  y: number;
  speed: number;
  angle: number;
}

interface IState {
  gameState: GameState;
  plane: Record<IPlane>;
  points: number;
  blocks: I.List<Record<IBlock>>;
  nextBlockInterval: number;
  nextBlockSide: BlockSide;
}

function createRecord<T>(opts: T): Record<T> {
  const RecordClass = makeRecordFactory<T>(opts);
  return new RecordClass();
}

function getInitialState() {
  const state = createRecord<IState>({
    gameState: GameState.Title,
    plane: createRecord<IPlane>({
      x: 40,
      y: 20,
      speed: 100,
      angle: MIN_ANGLE,
    }),
    points: 0,
    blocks: I.List([
      createRecord<IBlock>({x: 0, y: 100, width: 160, height: 40}),
    ]),
    nextBlockInterval: 100,
    nextBlockSide: BlockSide.Right,
  });

  return state;
}

function startGame(state: Record<IState>): Record<IState> {
  return getInitialState().set('gameState', GameState.Playing);
}

function update(state: Record<IState>, dt: number, keysDown: Set<number>): Record<IState> {
  if (this.gameState === GameState.Title || this.gameState === GameState.Dead) {
    if (keysDown.has(keyCodes.SPACE)) {
      return startGame(state);
    }

    return state;
  }

  /*
   * Handle input
   */

  if (keysDown.has(keyCodes.A)) {
    // turn left
    state = state.updateIn(['plane', 'angle'], (angle) => angle - ROTATION_SPEED * dt)
  }

  if (keysDown.has(keyCodes.D)) {
    // turn right
    state = state.updateIn(['plane', 'angle'], (angle) => angle + ROTATION_SPEED * dt)
  }

  if (state.plane.angle > MAX_ANGLE) {
    state = state.setIn(['plane', 'angle'], MAX_ANGLE);
  }

  if (state.plane.angle < MIN_ANGLE) {
    state = state.setIn(['plane', 'angle'], MIN_ANGLE);
  }

  /*
   * Update plane position
   */

  const {x, y} = calcVectorRadians(state.plane.speed * dt, state.plane.angle);
  state = state.updateIn(['plane', 'x'], (prevX) => prevX + x);
  state = state.updateIn(['plane', 'y'], (prevY) => prevY + y);

  /*
   * Test collisions
   */

  const planeCollider = new SAT.Polygon(new SAT.Vector(state.plane.x, state.plane.y), [
    new SAT.Vector(-PLANE_SIDE_LENGTH / 2, -PLANE_SIDE_LENGTH / 2),
    new SAT.Vector(-PLANE_SIDE_LENGTH / 2, PLANE_SIDE_LENGTH / 2),
    new SAT.Vector(PLANE_SIDE_LENGTH / 2, 0),
  ]);
  planeCollider.rotate(state.plane.angle);

  const blockColliders = state.blocks.map((block) => {
    return new SAT.Box(new SAT.Vector(block!.x, block!.y), block!.width, block!.height).toPolygon();
  });

  let collided = blockColliders.some((blockCollider) => {
    return SAT.testPolygonPolygon(planeCollider, blockCollider!);
  });

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
    return state.set('gameState', GameState.Dead);
  }

  /*
    * Update blocks
    */
  const cameraTop = state.plane.y - CAMERA_OFFSET;
  return updateBlocks(state, cameraTop);

  // TODO: Increment points when player passes a block
}

function updateBlocks(state: Record<IState>, cameraTop: number): Record<IState> {
  // Clean up offscreen blocks
  const blocks = state.blocks.filter((block) => {
    const blockBottom = block!.y + block!.height;
    return cameraTop <= blockBottom;
  }).toList();

  state.set('blocks', blocks);

  // Create blocks once they are visible and spawn the next one
  const cameraBottom = cameraTop + HEIGHT;

  const lastBlock = this.blocks.slice(-1)[0];

  if (cameraBottom - (lastBlock.y + lastBlock.height) >= state.nextBlockInterval) {
    if (state.nextBlockSide === BlockSide.Left) {
      this.blocks.push({
        x: 0,
        y: cameraBottom,
        width: 160,
        height: 40,
      });

      state = state.set('nextBlockSide', BlockSide.Right);

    } else {
      this.blocks.push({
        x: WIDTH - 160,
        y: cameraBottom,
        width: 160,
        height: 40,
      });

      state = state.set('nextBlockSide', BlockSide.Left);
    }
  }

  return state;
}

function drawPlane(ctx: CanvasRenderingContext2D, plane: IPlane) {
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

function draw(state: IState, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'white';

  if (state.gameState === GameState.Title) {
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.fillText('a game about a plane', WIDTH / 2, 90);
    ctx.font = '20px serif';
    ctx.fillText('press space, then a & d', WIDTH / 2, HEIGHT - 60);
    return;
  }

  // Draw platforms + plane (which scroll)
  ctx.save();
  ctx.translate(0, -(state.plane.y - CAMERA_OFFSET));

  state.blocks.forEach((block) => {
    ctx.fillRect(block!.x, block!.y, block!.width, block!.height);
  });

  drawPlane(ctx, state.plane);

  ctx.restore();

  // Draw walls
  ctx.fillRect(0, 0, WALL_WIDTH, HEIGHT);
  ctx.fillRect(WIDTH - WALL_WIDTH, 0, WALL_WIDTH, HEIGHT);

  if (state.gameState === GameState.Dead) {
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.strokeText('press space to play again :)', WIDTH / 2, HEIGHT / 2 + 50);
    ctx.fillText('press space to play again :)', WIDTH / 2, HEIGHT / 2 + 50);
  }
}

let then = Date.now();
function runLoop(prevState: any, canvas: HTMLCanvasElement) {
  requestAnimationFrame(() => {
    const now = Date.now();
    const dt = now - then;
    then = now;

    const state = update(prevState, dt / 1000, keysDown);
    draw(state, canvas);

    runLoop(state, canvas);
  });
}

function main() {
  const canvas = document.querySelector('canvas')!;
  registerListeners();
  scaleCanvas(canvas, WIDTH, HEIGHT);

  runLoop(getInitialState(), canvas);
}

main();