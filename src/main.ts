import * as SAT from 'sat';

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

enum GameState {
  Title,
  Playing,
  Dead,
};

enum BlockSide {
  Left,
  Right,
};

class BlockFriend {
  blocks: Block[];
  nextBlockInterval: number = 100;
  nextBlockSide: BlockSide = BlockSide.Right;

  constructor() {
    this.blocks = [
      {x: 0, y: 100, width: 160, height: 40},
    ];
  }

  update(cameraTop: number) {
    // Clean up offscreen blocks
    this.blocks = this.blocks.filter((block) => {
      const blockBottom = block.y + block.height;
      return cameraTop <= blockBottom;
    });

    // Create blocks once they are visible and spawn the next one
    const cameraBottom = cameraTop + HEIGHT;
    this.maybeGenBlock(cameraBottom);
  }

  maybeGenBlock(cameraBottom: number) {
    const lastBlock = this.blocks.slice(-1)[0];

    if (cameraBottom - (lastBlock.y + lastBlock.height) >= this.nextBlockInterval) {
      if (this.nextBlockSide === BlockSide.Left) {
        this.blocks.push({
          x: 0,
          y: cameraBottom,
          width: 160,
          height: 40,
        });

        this.nextBlockSide = BlockSide.Right;

      } else {
        this.blocks.push({
          x: WIDTH - 160,
          y: cameraBottom,
          width: 160,
          height: 40,
        });

        this.nextBlockSide = BlockSide.Left;
      }
    }
  }
}

class State {
  gameState: GameState = GameState.Title;

  plane: Plane;

  points: number;
  musicPlayer: MusicPlayer;
  blockFriend: BlockFriend;

  constructor(musicPlayer: MusicPlayer) {
    this.musicPlayer = musicPlayer;
  }

  get blocks() {
    return this.blockFriend.blocks;
  }

  startGame() {
    this.gameState = GameState.Playing;
    this.blockFriend = new BlockFriend();

    this.plane = {
      x: 40,
      y: 20,
      speed: 100,
      angle: MIN_ANGLE,
    };

    this.points = 0;
  }

  update(dt: number, keysDown: Set<number>) {
    if (this.gameState === GameState.Title) {
      if (keysDown.has(keyCodes.SPACE)) {
        this.musicPlayer.play();
        this.startGame();
      }

      return;
    }

    if (this.gameState === GameState.Dead) {
      if (keysDown.has(keyCodes.SPACE)) {
        this.startGame();
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
      this.gameState = GameState.Dead;
      return;
    }

    /*
     * Update blocks
     */
    const cameraTop = this.plane.y - CAMERA_OFFSET;
    this.blockFriend.update(cameraTop);

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

  for (let block of state.blocks) {
    ctx.fillRect(block.x, block.y, block.width, block.height);
  }

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
  const musicPlayer = new MusicPlayer();
  musicPlayer.install();

  const canvas = document.querySelector('canvas')!;
  registerListeners();
  scaleCanvas(canvas, WIDTH, HEIGHT);

  const state = new State(musicPlayer);

  runLoop(state, canvas);
}

main();