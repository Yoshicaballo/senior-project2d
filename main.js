/* Main game file: main.js */
/* Game: You vs the platformer */
/* Authors: Jaydrien*/
/* Description: Survive the platformer and the boss's wrath.*/
/* Citations: Copilot - distance formula, key tracking, basic drawing */
/* Note: If you use significant AI help you should cite that here as well */
/* In addition, of course, any AI-generated code should be clearly maked */
/* in comments throughout the code, though of course when using e.g. CoPilot */
/* auto-complete it maye be impractical to mark every line, which is why you */
/* should also include a summary here */

import "./style.css";
import TileMap from "./level.js";
import { GameInterface } from "simple-canvas-library";

const levelMap = new TileMap(64);
let currentLevel = 1;
levelMap.setLevel(currentLevel);

let gi = new GameInterface({ autoresize: true, fullscreen: true });

/* Constants: Named constants to avoid magic numbers */
/* Variables: Top-Level variables defined here are used to hold game state */
//hp amount and invulnerability timer
let iframe = 0;
// objects object holding all position, velocity, and physics parameters
let objects = {
  player: {
    x: 100, // horizontal position
    y: 300, // vertical position
    vx: 0, // horizontal velocity
    vy: 0, // vertical velocity
    speed: 0.5, // horizontal movement speed
    drag: 0.95, // horizontal drag for smoother stopping
    gravity: 0.25, // gravity strength - ADJUST THIS to change how fast objects falls
    jumpStrength: -8, // jump velocity (negative because up) - ADJUST THIS to change jump height
    onGround: false, // track if objects is on ground
    radius: 10, // objects drawing radius
    maxSpeed: 5, // maximum horizontal speed
    hearts: 3, // player health represented as hearts
    lives: 3, // player lives
  },
  enemy: [
    {
      x: 400, // horizontal position
      y: 300, // vertical position
      vx: 0, // horizontal velocity
      vy: 0, // vertical velocity
      speed: 0.5, // horizontal movement speed
      drag: 0.95, // horizontal drag for smoother stopping
      gravity: 0.25, // gravity strength - ADJUST THIS to change how fast objects falls
      jumpStrength: -8, // jump velocity (negative because up) - ADJUST THIS to change jump height
      onGround: false, // track if objects is on ground
      radius: 10, // objects drawing radius
      maxSpeed: 5, // maximum horizontal speed
      direction: 0, // initial direction, 1 right, -1 left
    },
    {
      x: 300, // horizontal position
      y: 200, // vertical position
      vx: 0, // horizontal velocity
      vy: 0, // vertical velocity
      speed: 0.5, // horizontal movement speed
      drag: 0.95, // horizontal drag for smoother stopping
      gravity: 0.25, // gravity strength - ADJUST THIS to change how fast objects falls
      jumpStrength: -8, // jump velocity (negative because up) - ADJUST THIS to change jump height
      onGround: false, // track if objects is on ground
      radius: 10, // objects drawing radius
      maxSpeed: 5, // maximum horizontal speed
      direction: 0, // initial direction, 1 right, -1 left
    },
  ],
  goal: {
    x: 1800,
    y: 500,
    radius: 10,
  },
};
let timeSurvived = 0;
// enemy start positions for each level


//enemy attack list and timer
/* Drawing Functions */
/* Example drawing function: you can add multiple drawing functions
that will be called in sequence each frame. It's a good idea to do 
one function per each object you are putting on screen, and you
may then want to break your drawing function down into sub-functions
to make it easier to read/follow */
// TODO: objects physics update

gi.addDrawing(function ({ ctx, width, height }) {
  levelMap.drawMap(ctx, width, height);
});

gi.addDrawing(function ({ ctx, width, height, elapsed, stepTime }) {
  // Your drawing code here...
  // draw objects
  ctx.beginPath();
  ctx.fillStyle = "red";
  ctx.arc(
    objects.player.x - levelMap.cameraX,
    objects.player.y - levelMap.cameraY,
    objects.player.radius,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = "purple";
  ctx.arc(
    objects.enemy[0].x - levelMap.cameraX,
    objects.enemy[0].y - levelMap.cameraY,
    objects.enemy[0].radius,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = "purple";
  ctx.arc(
    objects.enemy[1].x - levelMap.cameraX,
    objects.enemy[1].y - levelMap.cameraY,
    objects.enemy[1].radius,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = "gold";
  ctx.arc(
    objects.goal.x - levelMap.cameraX,
    objects.goal.y - levelMap.cameraY,
    objects.goal.radius,
    0,
    Math.PI * 2,
  );
  ctx.fill();
});

// change goal based on level
function updateGoal() {
  switch (currentLevel) {
    case 1:
      objects.goal.x = 4750;
      objects.goal.y = 250;
      break;
    case 2:
      objects.goal.x = 4300;
      objects.goal.y = 300;
      break;
    case 3:
      objects.goal.x = 1750;
      objects.goal.y = 370;
      break;
    default:
      objects.goal.x = 1800;
      objects.goal.y = 900;
  }
}
gi.addDrawing(function ({ stepTime }) {
  updateGoal();
});
// function to update enemy placement in the level upon level change, called in the level change function


// We compute the objects edge positions each frame and use them for tile collision.
// The objects itself is drawn as a circle, but collision checks treat it like a small box
// around the circle so we can test against tile rows/columns cleanly.

// - Apply gravity to pull objects down
// - Handle horizontal movement with A/D keys
// - Allow jumping with W key only when on ground
// - Check collisions against nearby tiles in the direction of motion
// - Prevent objects from going outside canvas boundaries

/**
 * Updates the objects's physics and movement each frame.
 * @param {object} params - The drawing parameters.
 * @param {number} params.stepTime - Time elapsed since last frame.
 * @param {number} params.width - Canvas width.
 * @param {number} params.height - Canvas height.
 */
function updateEnemies({ stepTime, width, height }) {
  const tileSize = levelMap.tileSize;
  for (let i = 0; i < objects.enemy.length; i++) {
    const enemy = objects.enemy[i];
    // Set initial direction towards player
    if (enemy.direction === 0) {
      enemy.direction = objects.player.x > enemy.x ? 1 : -1;
    }
    // Set horizontal velocity
    enemy.vx = enemy.speed * enemy.direction;
    // Apply horizontal movement
    enemy.x += enemy.vx;
    // Compute the enemy's current hitbox edges after horizontal movement.
    let left = enemy.x - enemy.radius + 1;
    let right = enemy.x + enemy.radius - 1;
    let top = enemy.y - enemy.radius + 1;
    let bottom = enemy.y + enemy.radius - 1;

    // Horizontal collision
    if (enemy.vx > 0) {
      // Moving right: check the right edge of the enemy against tiles.
      const col = Math.floor(right / tileSize);
      const rowTop = Math.floor(top / tileSize);
      const rowBottom = Math.floor(bottom / tileSize);
      for (let row = rowTop; row <= rowBottom; row++) {
        if (
          levelMap.isSolidTileAt(
            col * tileSize + 1,
            row * tileSize + tileSize / 2,
          )
        ) {
          // Snap the enemy to the left side of the tile and reverse direction.
          enemy.x = col * tileSize - enemy.radius;
          enemy.vx = 0;
          enemy.direction *= -1; // Reverse direction
          left = enemy.x - enemy.radius + 1;
          right = enemy.x + enemy.radius - 1;
          break;
        }
      }
    } else if (enemy.vx < 0) {
      // Moving left: check the left edge of the enemy against tiles.
      const col = Math.floor(left / tileSize);
      const rowTop = Math.floor(top / tileSize);
      const rowBottom = Math.floor(bottom / tileSize);
      for (let row = rowTop; row <= rowBottom; row++) {
        if (
          levelMap.isSolidTileAt(
            col * tileSize + tileSize - 1,
            row * tileSize + tileSize / 2,
          )
        ) {
          // Snap the enemy to the right side of the tile and reverse direction.
          enemy.x = col * tileSize + tileSize + enemy.radius;
          enemy.vx = 0;
          enemy.direction *= -1; // Reverse direction
          left = enemy.x - enemy.radius + 1;
          right = enemy.x + enemy.radius - 1;
          break;
        }
      }
    }

    enemy.vy += (enemy.gravity * stepTime) / 10;
    enemy.y += enemy.vy;

    left = enemy.x - enemy.radius + 1;
    right = enemy.x + enemy.radius - 1;
    top = enemy.y - enemy.radius + 1;
    bottom = enemy.y + enemy.radius - 1;
    enemy.onGround = false;

    if (enemy.vy >= 0) {
      // moving down or standing: check the bottom edge for floor tiles
      const row = Math.floor(bottom / tileSize);
      const colLeft = Math.floor(left / tileSize);
      const colRight = Math.floor(right / tileSize);
      for (let col = colLeft; col <= colRight; col++) {
        if (
          levelMap.isSolidTileAt(
            col * tileSize + tileSize / 2,
            row * tileSize + 1,
          )
        ) {
          // snap to the top of the floor tile and stop falling
          enemy.y = row * tileSize - enemy.radius;
          enemy.vy = 0;
          enemy.onGround = true;
          top = enemy.y - enemy.radius + 1;
          bottom = enemy.y + enemy.radius - 1;
          break;
        }
      }
    } else if (enemy.vy < 0) {
      // moving up: check the top edge for ceiling tiles
      const row = Math.floor(top / tileSize);
      const colLeft = Math.floor(left / tileSize);
      const colRight = Math.floor(right / tileSize);
      for (let col = colLeft; col <= colRight; col++) {
        if (
          levelMap.isSolidTileAt(
            col * tileSize + tileSize / 2,
            row * tileSize + tileSize - 1,
          )
        ) {
          // snap to below the ceiling tile and stop upward movement
          enemy.y = row * tileSize + tileSize + enemy.radius;
          enemy.vy = 0;
          top = enemy.y - enemy.radius + 1;
          bottom = enemy.y + enemy.radius - 1;
          break;
        }
      }
    }
    // Prevent enemy from leaving the level bounds
    if (enemy.x >= levelMap.getWidth() - enemy.radius) {
      enemy.x = levelMap.getWidth() - enemy.radius;
      enemy.direction *= -1;
    }
    if (enemy.x <= enemy.radius) {
      enemy.x = enemy.radius;
      enemy.direction *= -1;
    }
    if (enemy.y <= enemy.radius) {
      enemy.y = enemy.radius;
      enemy.vy = 0;
    }
    if (enemy.y >= levelMap.getHeight() - enemy.radius) {
      enemy.y = levelMap.getHeight() - enemy.radius;
      enemy.vy = 0;
    }
  }
}
function goalCollision() {
  const dx = objects.player.x - objects.goal.x;
  const dy = objects.player.y - objects.goal.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < objects.player.radius + objects.goal.radius) {
    // Player reached the goal, reset level or go to next level
    currentLevel++;
    levelMap.setLevel(currentLevel);
    // Reset player position and state
    switch (currentLevel) {
      case 2:
        objects.player.x = 100;
        objects.player.y = 300;
        objects.enemy[0].x = 450;
        objects.enemy[0].y = 280;
        objects.enemy[1].x = 800;
        objects.enemy[1].y = 220;
        break;
      case 3:
        objects.player.x = 100;
        objects.player.y = 300;
        objects.enemy[0].x = 1300;
        objects.enemy[0].y = 240;
        objects.enemy[1].x = 1500;
        objects.enemy[1].y = 220;
        break;
        case 4:
          objects.player.x = 100;
          objects.player.y = 300;
          objects.enemy[0].x = 3000;
          objects.enemy[0].y = 3000;
          objects.enemy[1].x = 3000;
          objects.enemy[1].y = 3000;
          break;
      default:
        currentLevel = 1;
    objects.player.x = 100;
    objects.player.y = 300;
    objects.player.vx = 0;
    objects.player.vy = 0;
    objects.player.onGround = false;
    // Reset enemies and level-specific state
  }
}}
gi.addDrawing(function ({ stepTime }) {
  updateEnemies({ stepTime });
  goalCollision();
  checkEnemyCollision();
});
function updateobjects({ stepTime, width, height }) {
  const tileSize = levelMap.tileSize;
  const player = objects.player;

  // Handle horizontal movement with A/D keys
  if (
    !(keysDown.a || keysDown.ArrowLeft || keysDown.d || keysDown.ArrowRight) &&
    Math.abs(player.vx) < 0.2
  ) {
    player.vx = 0;
  }
  if (player.vx > player.maxSpeed) {
    player.vx = player.maxSpeed;
  }
  if (player.vx < -player.maxSpeed) {
    player.vx = -player.maxSpeed;
  }
  if (keysDown.a || keysDown.ArrowLeft) {
    player.vx -= player.speed;
  }
  if (keysDown.d || keysDown.ArrowRight) {
    player.vx += player.speed;
  }
  //slow down player with drag and move horizontally
  player.vx *= player.drag;
  player.x += player.vx;

  // Compute the player's current hitbox edges after horizontal movement.
  // Using +1 / -1 makes the tile collision tests slightly smaller than the full circle.
  let left = player.x - player.radius + 1;
  let right = player.x + player.radius - 1;
  let top = player.y - player.radius + 1;
  let bottom = player.y + player.radius - 1;

  if (player.vx > 0) {
    // Moving right: check the right edge of the player against tiles.
    const col = Math.floor(right / tileSize);
    const rowTop = Math.floor(top / tileSize);
    const rowBottom = Math.floor(bottom / tileSize);
    for (let row = rowTop; row <= rowBottom; row++) {
      if (
        levelMap.isSolidTileAt(
          col * tileSize + 1,
          row * tileSize + tileSize / 2,
        )
      ) {
        // Snap the player to the left side of the tile and stop horizontal movement.
        player.x = col * tileSize - player.radius;
        player.vx = 0;
        left = player.x - player.radius + 1;
        right = player.x + player.radius - 1;
        break;
      }
    }
  } else if (player.vx < 0) {
    // Moving left: check the left edge of the player against tiles.
    const col = Math.floor(left / tileSize);
    const rowTop = Math.floor(top / tileSize);
    const rowBottom = Math.floor(bottom / tileSize);
    for (let row = rowTop; row <= rowBottom; row++) {
      if (
        levelMap.isSolidTileAt(
          col * tileSize + tileSize - 1,
          row * tileSize + tileSize / 2,
        )
      ) {
        // Snap the player to the right side of the tile and stop horizontal movement.
        player.x = col * tileSize + tileSize + player.radius;
        player.vx = 0;
        left = player.x - player.radius + 1;
        right = player.x + player.radius - 1;
        break;
      }
    }
  }

  // Gravity and jumping
  player.vy += (player.gravity * stepTime) / 10;
  if ((keysDown.w || keysDown.ArrowUp) && player.onGround) {
    player.vy = player.jumpStrength;
    player.onGround = false;
  }
  // collision detection for all objects after vertical movement

  player.y += player.vy;
  // I must change player logic into general objects logic to make it work for all objects
  left = player.x - player.radius + 1;
  right = player.x + player.radius - 1;
  top = player.y - player.radius + 1;
  bottom = player.y + player.radius - 1;
  player.onGround = false;

  if (player.vy >= 0) {
    // moving down or standing: check the bottom edge for floor tiles
    const row = Math.floor(bottom / tileSize);
    const colLeft = Math.floor(left / tileSize);
    const colRight = Math.floor(right / tileSize);
    for (let col = colLeft; col <= colRight; col++) {
      if (
        levelMap.isSolidTileAt(
          col * tileSize + tileSize / 2,
          row * tileSize + 1,
        )
      ) {
        // snap to the top of the floor tile and stop falling
        player.y = row * tileSize - player.radius;
        player.vy = 0;
        player.onGround = true;
        top = player.y - player.radius + 1;
        bottom = player.y + player.radius - 1;
        // Check if standing on spike tile (type 2)
        const tileType = levelMap.getTileType(
          col * tileSize + tileSize / 2,
          row * tileSize + 1,
        );
        if (tileType === 2 && iframe <= 0) {
          objects.player.hearts -= 1;
          iframe = 100;
        }
        break;
      }
    }
  } else if (player.vy < 0) {
    // moving up: check the top edge for ceiling tiles
    const row = Math.floor(top / tileSize);
    const colLeft = Math.floor(left / tileSize);
    const colRight = Math.floor(right / tileSize);
    for (let col = colLeft; col <= colRight; col++) {
      if (
        levelMap.isSolidTileAt(
          col * tileSize + tileSize / 2,
          row * tileSize + tileSize - 1,
        )
      ) {
        // snap to below the ceiling tile and stop upward movement
        player.y = row * tileSize + tileSize + player.radius;
        player.vy = 0;
        top = player.y - player.radius + 1;
        bottom = player.y + player.radius - 1;
        break;
      }
    }
  }
  // Prevent player from leaving the level
  if (player.x >= levelMap.getWidth() - player.radius) {
    player.x = levelMap.getWidth() - player.radius;
    player.vx = 0;
  }
  if (player.x <= player.radius) {
    player.x = player.radius;
    player.vx = 0;
  }
  if (player.y <= player.radius) {
    player.y = player.radius;
    player.vy = 0;
  }
  if (player.y >= levelMap.getHeight() - player.radius) {
    player.y = levelMap.getHeight() - player.radius;
    player.vy = 0;
  }

  // Update enemies
  updateEnemies({ stepTime, width, height });

  // Update camera
  levelMap.updateCamera(objects.player.x, objects.player.y, width, height);
}

// Call the objects update function each frame
gi.addDrawing(updateobjects);
/* Input Handlers */

/* Example: Mouse click handler (you can change to handle 
any type of event -- keydown, mousemove, etc) */

/* Mr. Hinkle showed how to use a keysDown object to track
which keys are currently down with separate keydown and keyup
handlers and then an addDrawing for smooth updates :)
Comment also by Mr. Hinkle because he tries to model
best practices */
let keysDown = {
  // an object to keep track of what keys are currently pressed...
  w: false,
  a: false,
  s: false,
  d: false,
  // fill in...
};
gi.addHandler("keydown", function ({ event, x, y }) {
  keysDown[event.key] = true;
  console.log("keysDown:", keysDown);
});
gi.addHandler("keyup", function ({ event, x, y }) {
  keysDown[event.key] = false;
  console.log("keysDown:", keysDown);
});
// heart and time display function
gi.addDrawing(function ({ ctx, width, height, elapsed, stepTime }) {
  // Your drawing code here...
  ctx.fillStyle = "green";
  ctx.font = "20px Arial";
  ctx.fillText(`Health - ${objects.player.hearts}`, 20, 20);
  ctx.fillText(`Time - ${timeSurvived.toFixed(2)}`, width / 2, 20);
  ctx.fillText(`Lives - ${objects.player.lives}`, 20, 40);
});
// testing x and y
gi.addDrawing(function ({ ctx, width, height, elapsed, stepTime }) {
  ctx.fillStyle = "blue";
  ctx.font = "20px Arial";
  ctx.fillText(`X - ${objects.player.x.toFixed(2)}`, 20, 60);
  ctx.fillText(`Y - ${objects.player.y.toFixed(2)}`, 20, 80);
  // tutorial text, never fixed to player position and only appears in level 1
  if (currentLevel === 1) {
    ctx.fillStyle = "red";
    ctx.font = "16px Arial";
    ctx.fillText(
      `Use WASD or arrow keys to move and jump. Reach the gold circle to win and never touch purple`,
      50,
      height - 20,
    );
  } else if (currentLevel > 1 && !currentLevel === 4) {
    ctx.fillStyle = "red";
    ctx.font = "16px Arial";
    ctx.fillText(`Level ${currentLevel}`, width - 100, height - 20);
  } else if (currentLevel === 4) {
    ctx.fillStyle = "red";
    ctx.font = "16px Arial";
    ctx.fillText(`You won! Refresh the page to play again.`, 50, height - 20);
  }
});
function checkEnemyCollision() {
  // AI-generated: collision detection logic between player and enemies
  for (let i = 0; i < objects.enemy.length; i++) {
    const enemy = objects.enemy[i];
    const dx = objects.player.x - enemy.x;
    const dy = objects.player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if circles are colliding
    if (dist < objects.player.radius + enemy.radius) {
      if (iframe <= 0) {
        objects.player.hearts -= 1;
        iframe = 100;
      }
    }
  }
}
// update invulnerability timer
function iframeTimer(stepTime) {
  if (iframe > 0) {
    iframe -= stepTime / 10;
    if (iframe < 0) iframe = 0;
  }
}
// call iframeTimer every frame to decrease iframe
gi.addDrawing(function ({ stepTime }) {
  iframeTimer(stepTime);
});
// lose a life if hearts reach 0 or player y is less than or equal to 0 and reset hearts to 3, then check for game over in the next drawing function
function checkPlayerHealth() {
  if (objects.player.hearts <= 0 || objects.player.y >= 437) {
    objects.player.lives -= 1;
    objects.player.hearts = 3;
    // reset player position
    objects.player.x = 100;
    objects.player.y = 300;
    objects.player.vx = 0;
    objects.player.vy = 0;
    objects.player.onGround = false;
    // reset enemies and level-specific state
  }
}
gi.addDrawing(function ({ stepTime }) {
  checkPlayerHealth();
});
// execute the game over. Game over!
gi.addDrawing(function ({ ctx, width, height }) {
  if (objects.player.lives <= 0) {
    gameOver(ctx, width, height);
  }
});
// game over function
function gameOver(ctx, width, height) {
  ctx.fillStyle = "grey";
  ctx.font = "50px Arial";
  ctx.fillText(`Game Over...`, width / 5, height / 2);
  gi.stop();
}
// update timeSurvived
gi.addDrawing(function ({ stepTime }) {
  timeSurvived += stepTime / 1000;
  // End generated code
});
// level' data to default positions
// attack timer - update the enemy attack timer and select new level

// End generated code

/* Run the game */
gi.run();