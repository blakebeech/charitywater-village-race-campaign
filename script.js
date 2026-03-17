// ================================================================
//  charity: water Dash — script.js
//
//  A lane-based endless runner set across sub-Saharan Africa.
//  Inspired by the fast, forward-moving feel of Sonic Dash.
//
//  HOW TO PLAY
//    ← → (or A / D) — Switch between the 3 running lanes
//    ↑  (or Space)  — Jump over low obstacles
//    Mobile: swipe left/right to change lane, swipe up to jump
//
//  SCORING
//    +1    every frame (distance bonus)
//    +10   per water drop collected
//    +50   per jerrican collected
//    +100  per village milestone reached
//
//  FILE STRUCTURE
//    1.  Canvas & resize
//    2.  Layout helpers  (recalculated on every resize)
//    3.  Constants & colour palette
//    4.  Game-state variables
//    5.  Player object
//    6.  Input handling  (keyboard + touch)
//    7.  Spawning helpers
//    8.  Update functions  (run once per frame)
//    9.  Collision detection
//   10.  Particles
//   11.  HUD / UI helpers
//   12.  Draw functions
//   13.  Main game loop & button wiring
// ================================================================


// ────────────────────────────────────────────────────────────────
// 1.  CANVAS & RESIZE
// ────────────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

/** Fit the canvas to the current browser window */
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); recalcLayout(); });


// ────────────────────────────────────────────────────────────────
// 2.  LAYOUT HELPERS
//     All pixel values are derived from canvas dimensions so the
//     game looks good on any screen size.
// ────────────────────────────────────────────────────────────────

let layout = {};

function recalcLayout() {
  const W = canvas.width;
  const H = canvas.height;

  layout = {
    W, H,

    // The horizon line separating sky from ground
    groundY: H * 0.52,

    // Player is fixed on the X axis (left side of screen)
    playerX: W * 0.18,

    // Y position of the player's feet in each of the 3 lanes
    // Lane 0 = top (far), Lane 1 = middle, Lane 2 = bottom (near)
    laneY: [
      H * 0.645,
      H * 0.765,
      H * 0.880,
    ],

    // Sizes all relative to screen height
    playerW:    H * 0.055,
    playerH:    H * 0.110,
    obsW:       H * 0.058,
    obsH:       H * 0.058,
    dropR:      H * 0.022,
    jerW:       H * 0.038,
    jerH:       H * 0.058,

    // How high the player rises at the peak of a jump
    jumpHeight: H * 0.135,
  };
}

recalcLayout();


// ────────────────────────────────────────────────────────────────
// 3.  CONSTANTS & COLOUR PALETTE
// ────────────────────────────────────────────────────────────────

const LANES        = 3;
const INIT_SPEED   = 5;      // pixels per frame at game start
const MAX_SPEED    = 20;     // speed cap
const SPEED_RAMP   = 0.0014; // extra pixels/frame added each frame
const JUMP_FRAMES  = 38;     // frames for a complete jump arc
const LANE_LERP    = 0.17;   // how quickly the player slides to a new lane (0–1)
const MILESTONE_MS = 2800;   // milliseconds to display a milestone message
// Pixels-to-metres conversion: at INIT_SPEED a relaxed jog (~2 m/s at 60 fps)
// feels about right with this factor (purely for the feel-good score display).
const PX_TO_METRES = 0.042;

// charity: water brand colours + game-specific tones
const C = {
  yellow:    '#FFC907',
  blue:      '#009FE3',
  darkBlue:  '#0067A5',
  dark:      '#1A1A1A',
  skin:      '#E8B078',
  hair:      '#3A2208',
  shirt:     '#009FE3',   // charity: water blue
  trousers:  '#1A1A1A',
  shoe:      '#FFC907',   // yellow shoes
  ground:    '#C89060',
  rockLight: '#B8A090',
  rockDark:  '#806050',
  bushDk:    '#5A3210',
  bushMid:   '#7A5220',
  treeTrunk: '#6A3A10',
  treeCrown: '#3A7030',
};

// Countries the player passes through as distance grows (in metres)
const COUNTRIES = [
  { name: 'Ethiopia',   km: 0     },
  { name: 'Kenya',      km: 2500  },
  { name: 'Uganda',     km: 5500  },
  { name: 'Tanzania',   km: 9000  },
  { name: 'Rwanda',     km: 12500 },
  { name: 'Mozambique', km: 16000 },
  { name: 'Zambia',     km: 20000 },
];

// Uplifting messages shown on the game-over screen
const GAME_OVER_MSGS = [
  'Every drop of water changes a life.',
  'Clean water gives time back to communities.',
  'Keep running — the journey never ends.',
  'Water is the foundation of everything.',
  'Hope flows where clean water goes.',
];


// ────────────────────────────────────────────────────────────────
// 4.  GAME-STATE VARIABLES
// ────────────────────────────────────────────────────────────────

let state;        // 'start' | 'playing' | 'over'
let score;
let distance;     // metres travelled
let drops;        // water drops collected
let villages;     // village milestones hit
let speed;        // current scroll speed (px/frame)
let frame;        // frame counter (used for spawning intervals)
let countryIdx;   // index into COUNTRIES array
let scrollX;      // global scroll offset (for ground texture)

let obstacles;    // array of obstacle objects
let collectibles; // array of collectible objects
let bgObjs;       // decorative background objects (trees, rocks)
let particles;    // visual burst particles

let milestoneTimeoutId = null;


// ────────────────────────────────────────────────────────────────
// 5.  PLAYER OBJECT
// ────────────────────────────────────────────────────────────────

const player = {
  lane:       1,   // logical lane (0 / 1 / 2)
  targetLane: 1,   // lane the player is sliding toward
  laneY:      0,   // current interpolated Y (feet position)
  y:          0,   // final Y after jump arc is added
  jumping:    false,
  jumpFrame:  0,
  blink:      0,   // frames of post-hit invincibility (0 = vulnerable)
};

function resetPlayer() {
  player.lane       = 1;
  player.targetLane = 1;
  player.laneY      = layout.laneY[1];
  player.y          = layout.laneY[1];
  player.jumping    = false;
  player.jumpFrame  = 0;
  player.blink      = 0;
}


// ────────────────────────────────────────────────────────────────
// 6.  INPUT HANDLING
// ────────────────────────────────────────────────────────────────

const keys = new Set();

document.addEventListener('keydown', e => {
  if (keys.has(e.code)) return; // ignore auto-repeat
  keys.add(e.code);

  if (state !== 'playing') return;

  if (e.code === 'ArrowLeft'  || e.code === 'KeyA') changeLane(-1);
  if (e.code === 'ArrowRight' || e.code === 'KeyD') changeLane(+1);
  if (e.code === 'ArrowUp'    || e.code === 'Space') doJump();

  // Stop the page from scrolling while playing
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
    e.preventDefault();
  }
});

document.addEventListener('keyup', e => keys.delete(e.code));

// ── Mobile touch / swipe ─────────────────────────────────────
let touchX0 = 0;
let touchY0 = 0;

canvas.addEventListener('touchstart', e => {
  touchX0 = e.touches[0].clientX;
  touchY0 = e.touches[0].clientY;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', e => {
  if (state !== 'playing') return;
  const dx = e.changedTouches[0].clientX - touchX0;
  const dy = e.changedTouches[0].clientY - touchY0;
  if (Math.abs(dy) > Math.abs(dx) && dy < -30) { doJump(); }
  else if (dx >  30) changeLane(+1);
  else if (dx < -30) changeLane(-1);
  e.preventDefault();
}, { passive: false });

// ── Helpers ───────────────────────────────────────────────────

function changeLane(dir) {
  const next = player.targetLane + dir;
  if (next >= 0 && next < LANES) player.targetLane = next;
}

function doJump() {
  if (!player.jumping) {
    player.jumping   = true;
    player.jumpFrame = 0;
  }
}


// ────────────────────────────────────────────────────────────────
// 7.  SPAWNING HELPERS
// ────────────────────────────────────────────────────────────────

/**
 * Spawn an obstacle wave.
 * Early game: one obstacle leaves two safe lanes.
 * Later game:  two obstacles force player into a single safe lane.
 */
function spawnObstacleWave() {
  const maxBlock = distance < 1500 ? 1 : (distance < 5000 ? 1 : 2);
  const count    = Math.floor(Math.random() * maxBlock) + 1;
  const types    = ['rock', 'bush', 'log'];
  const lanes    = shuffleArray([0, 1, 2]).slice(0, count);

  lanes.forEach(lane => {
    obstacles.push({
      lane,
      x:    canvas.width + 80,
      type: types[Math.floor(Math.random() * types.length)],
    });
  });
}

/** Spawn a water-drop or (occasionally) a jerrican */
function spawnCollectible() {
  const lane = Math.floor(Math.random() * LANES);
  const type = Math.random() < 0.12 ? 'jerrican' : 'drop';
  collectibles.push({
    lane,
    x:   canvas.width + 60,
    type,
    bob: Math.random() * Math.PI * 2,  // random start phase for bobbing
  });
}

/** Spawn a decorative background object (acacia, rock, shrub) */
function spawnBgObj(startX) {
  const types = ['acacia', 'acacia', 'acacia', 'rock', 'shrub'];
  const sides = ['far', 'near'];
  bgObjs.push({
    x:    startX !== undefined ? startX : canvas.width + 80,
    type: types[Math.floor(Math.random() * types.length)],
    side: sides[Math.floor(Math.random() * sides.length)],
    sc:   0.55 + Math.random() * 0.90,  // random scale
    spd:  0.33 + Math.random() * 0.28,  // parallax speed factor
  });
}

/** Seed the background with trees/rocks spread across the canvas */
function seedBgObjects() {
  for (let i = 0; i < 14; i++) {
    spawnBgObj(Math.random() * canvas.width);
  }
}

/** Return a copy of an array in a uniformly random order (Fisher-Yates) */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


// ────────────────────────────────────────────────────────────────
// 8.  UPDATE FUNCTIONS  (called once per frame while playing)
// ────────────────────────────────────────────────────────────────

/** Master update — called every frame while state === 'playing' */
function update() {
  frame++;
  scrollX += speed;

  // Gradually increase speed up to the cap
  speed = Math.min(MAX_SPEED, INIT_SPEED + frame * SPEED_RAMP);

  // Advance distance (pixels → metres via feel-good conversion factor)
  distance += speed * PX_TO_METRES;
  score    += 1;

  updatePlayer();
  updateObstacles();
  updateCollectibles();
  updateBgObjs();
  updateParticles();
  handleSpawning();
  checkMilestones();
  updateHUD();
}

// ── Player ────────────────────────────────────────────────────
function updatePlayer() {
  // Smoothly interpolate toward the target lane Y
  const targetY = layout.laneY[player.targetLane];
  player.laneY += (targetY - player.laneY) * LANE_LERP;

  // Parabolic jump arc: rises then falls back to laneY
  let jumpOffset = 0;
  if (player.jumping) {
    player.jumpFrame++;
    const t = player.jumpFrame / JUMP_FRAMES;
    jumpOffset = -layout.jumpHeight * 4 * t * (1 - t); // 4t(1-t) peaks at t=0.5
    if (player.jumpFrame >= JUMP_FRAMES) {
      player.jumping   = false;
      player.jumpFrame = 0;
    }
  }
  player.y = player.laneY + jumpOffset;

  if (player.blink > 0) player.blink--;
}

// ── Obstacles ─────────────────────────────────────────────────
function updateObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x -= speed;
    if (o.x < -120) { obstacles.splice(i, 1); continue; }
    if (player.blink === 0 && hitsObstacle(o)) {
      endGame();
      return;
    }
  }
}

// ── Collectibles ──────────────────────────────────────────────
function updateCollectibles() {
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const c = collectibles[i];
    c.x   -= speed;
    c.bob += 0.065; // advance bobbing phase
    if (c.x < -80) { collectibles.splice(i, 1); continue; }
    if (hitsCollectible(c)) {
      collectibles.splice(i, 1);
      if (c.type === 'drop') {
        drops  += 1;
        score  += 10;
        burst(c.x, layout.laneY[c.lane], C.blue, 8);
      } else {
        drops  += 5;
        score  += 50;
        burst(c.x, layout.laneY[c.lane], C.yellow, 14);
      }
      updateHUD();
    }
  }
}

// ── Background objects ────────────────────────────────────────
function updateBgObjs() {
  for (let i = bgObjs.length - 1; i >= 0; i--) {
    bgObjs[i].x -= speed * bgObjs[i].spd;
    if (bgObjs[i].x < -220) bgObjs.splice(i, 1);
  }
  // Randomly add new trees / rocks
  if (Math.random() < 0.025) spawnBgObj();
}

// ── Particles ─────────────────────────────────────────────────
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.28; // gravity
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ── Spawning intervals ────────────────────────────────────────
function handleSpawning() {
  // Obstacles: interval shrinks as distance grows (harder)
  const obsInterval = Math.max(52, 130 - distance * 0.014);
  if (frame % Math.round(obsInterval) === 0) spawnObstacleWave();

  // Collectibles: a bit more frequent than obstacles
  const colInterval = Math.max(38, 78 - distance * 0.005);
  if (frame % Math.round(colInterval) === 0) spawnCollectible();
}

// ── Milestone checks ──────────────────────────────────────────
function checkMilestones() {
  // Village every 500 m
  const newVillages = Math.floor(distance / 500);
  if (newVillages > villages) {
    villages = newVillages;
    score   += 100;
    showMilestone(`🏘️  Village ${villages} reached!  +100`);
    burst(canvas.width / 2, canvas.height * 0.7, C.yellow, 28);
  }

  // Country progression
  for (let i = countryIdx + 1; i < COUNTRIES.length; i++) {
    if (distance >= COUNTRIES[i].km) {
      countryIdx = i;
      showMilestone(`🌍  Entering ${COUNTRIES[i].name}!`);
    }
  }
}


// ────────────────────────────────────────────────────────────────
// 9.  COLLISION DETECTION
// ────────────────────────────────────────────────────────────────

/** Returns true if the player overlaps an obstacle */
function hitsObstacle(o) {
  // Different lane → no collision
  if (player.targetLane !== o.lane) return false;

  // If the player is clearly airborne they clear rocks/bushes.
  // Logs (ground-level barrier) cannot be jumped over.
  if (player.jumping && player.jumpFrame < JUMP_FRAMES * 0.82 && o.type !== 'log') {
    return false;
  }

  const { playerX, playerW, playerH, obsW, obsH, laneY } = layout;
  const TOL = 9; // forgiveness tolerance in pixels

  // Player bounding box (feet at player.y)
  const px1 = playerX        + TOL;
  const px2 = playerX + playerW - TOL;
  const py1 = player.y - playerH + TOL;
  const py2 = player.y            - TOL;

  // Obstacle bounding box (centred on its x, feet at laneY[lane])
  const ox1 = o.x - obsW * 0.5;
  const ox2 = o.x + obsW * 0.5;
  const oy1 = laneY[o.lane] - obsH;
  const oy2 = laneY[o.lane];

  return px2 > ox1 && px1 < ox2 && py2 > oy1 && py1 < oy2;
}

/** Returns true if the player is close enough to collect an item */
function hitsCollectible(c) {
  if (player.targetLane !== c.lane) return false;

  const { playerX, playerW, playerH, laneY, dropR, jerW } = layout;
  const reach = dropR + (c.type === 'jerrican' ? jerW * 0.7 : dropR * 0.6) + 10;

  // Use circle–point distance from player centre to collectible centre
  const pcx = playerX + playerW / 2;
  const pcy = player.y - playerH / 2;
  return Math.hypot(pcx - c.x, pcy - laneY[c.lane]) < reach + playerW * 0.4;
}


// ────────────────────────────────────────────────────────────────
// 10. PARTICLES
// ────────────────────────────────────────────────────────────────

/** Emit n particles in a starburst from (x, y) */
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i + Math.random() * 0.5;
    const spd   = 1.5 + Math.random() * 3.5;
    particles.push({
      x, y,
      vx:    Math.cos(angle) * spd,
      vy:    Math.sin(angle) * spd - 1.8,
      color,
      r:     2 + Math.random() * 3,
      life:  28 + Math.random() * 22,
    });
  }
}


// ────────────────────────────────────────────────────────────────
// 11. HUD / UI HELPERS
// ────────────────────────────────────────────────────────────────

function updateHUD() {
  document.getElementById('distanceVal').textContent = Math.floor(distance) + ' m';
  document.getElementById('scoreVal').textContent    = Math.floor(score);
  document.getElementById('dropVal').textContent     = drops;
  document.getElementById('locationVal').textContent = COUNTRIES[countryIdx].name;
}

/** Show a golden message in the HUD centre for MILESTONE_MS milliseconds */
function showMilestone(msg) {
  const el = document.getElementById('milestoneMsg');
  el.textContent = msg;
  el.classList.add('show');
  if (milestoneTimeoutId) clearTimeout(milestoneTimeoutId);
  milestoneTimeoutId = setTimeout(() => el.classList.remove('show'), MILESTONE_MS);
}

/** Transition to the game-over screen */
function endGame() {
  state = 'over';
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('dropBadge').classList.add('hidden');

  document.getElementById('go-distance').textContent = Math.floor(distance) + ' m';
  document.getElementById('go-score').textContent    = Math.floor(score);
  document.getElementById('go-drops').textContent    = drops;
  document.getElementById('go-villages').textContent = villages;

  // Pick a message based on how many drops were collected
  const msgIdx = Math.min(Math.floor(drops / 8), GAME_OVER_MSGS.length - 1);
  document.getElementById('go-message').textContent = GAME_OVER_MSGS[msgIdx];

  document.getElementById('gameOverScreen').classList.remove('hidden');
}

/** Set up a fresh game (called on start and restart) */
function initGame() {
  score      = 0;
  distance   = 0;
  drops      = 0;
  villages   = 0;
  speed      = INIT_SPEED;
  frame      = 0;
  countryIdx = 0;
  scrollX    = 0;

  obstacles   = [];
  collectibles = [];
  bgObjs      = [];
  particles   = [];

  resetPlayer();
  seedBgObjects();
  updateHUD();
}


// ────────────────────────────────────────────────────────────────
// 12. DRAW FUNCTIONS
// ────────────────────────────────────────────────────────────────

/** Master draw — called every frame regardless of state */
function draw() {
  const { W, H } = layout;
  ctx.clearRect(0, 0, W, H);

  drawSky();
  drawGround();
  drawBgObjects();
  drawLaneGuides();
  drawObstacles();
  drawCollectibles();
  drawPlayer();
  drawParticles();
}

// ── Sky & mountains ───────────────────────────────────────────

function drawSky() {
  const { W, groundY } = layout;

  // Warm African dusk gradient
  const grad = ctx.createLinearGradient(0, 0, 0, groundY);
  grad.addColorStop(0,    '#1B3D6E');
  grad.addColorStop(0.50, '#D96820');
  grad.addColorStop(1,    '#FFBC60');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, groundY);

  // Glowing sun disc
  const sx = W * 0.76, sy = groundY * 0.24;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90);
  sg.addColorStop(0,   'rgba(255,235,120,1)');
  sg.addColorStop(0.35,'rgba(255,180,55,0.75)');
  sg.addColorStop(1,   'rgba(255,130,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sx, sy, 90, 0, Math.PI * 2);
  ctx.fill();

  // Silhouetted mountain range along the horizon
  drawMountains();
}

function drawMountains() {
  const { W, groundY } = layout;
  ctx.fillStyle = 'rgba(70, 25, 8, 0.30)';
  ctx.beginPath();
  ctx.moveTo(0, groundY);

  // Relative [x, y] control points — values are fractions of W and groundY
  const pts = [
    [0.00, 0.88], [0.05, 0.77], [0.11, 0.68], [0.17, 0.74],
    [0.23, 0.61], [0.30, 0.70], [0.37, 0.59], [0.43, 0.67],
    [0.51, 0.63], [0.57, 0.72], [0.64, 0.66], [0.71, 0.75],
    [0.78, 0.69], [0.85, 0.78], [0.93, 0.73], [1.00, 0.82],
    [1.00, 1.00],
  ];
  pts.forEach(([xr, yr]) => ctx.lineTo(W * xr, groundY * yr));
  ctx.closePath();
  ctx.fill();
}

// ── Ground ────────────────────────────────────────────────────

function drawGround() {
  const { W, H, groundY } = layout;

  // Earth gradient: warm sandy red at horizon → deep brown at bottom
  const gg = ctx.createLinearGradient(0, groundY, 0, H);
  gg.addColorStop(0,   '#C89060');
  gg.addColorStop(0.5, '#A87040');
  gg.addColorStop(1,   '#784820');
  ctx.fillStyle = gg;
  ctx.fillRect(0, groundY, W, H - groundY);

  // Scrolling diagonal streaks give the illusion of movement
  ctx.strokeStyle = 'rgba(80, 40, 10, 0.14)';
  ctx.lineWidth   = 1;
  const streakCount = 22;
  for (let i = 0; i < streakCount; i++) {
    const offset = (scrollX * 0.75 + i * (W / streakCount)) % W;
    ctx.beginPath();
    ctx.moveTo(offset - W, groundY + 2);
    ctx.lineTo(offset,     H);
    ctx.stroke();
  }

  // Lighter centre dirt track (the running path)
  const tw  = W * 0.40;
  const tg  = ctx.createLinearGradient(0, groundY, 0, H);
  tg.addColorStop(0, 'rgba(220, 185, 140, 0.55)');
  tg.addColorStop(1, 'rgba(180, 135, 80,  0.22)');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(W / 2 - tw * 0.13, groundY);
  ctx.lineTo(W / 2 + tw * 0.13, groundY);
  ctx.lineTo(W / 2 + tw * 0.52, H);
  ctx.lineTo(W / 2 - tw * 0.52, H);
  ctx.closePath();
  ctx.fill();
}

// ── Background decorative objects (trees, rocks, shrubs) ──────

function drawBgObjects() {
  bgObjs.forEach(obj => {
    const yBase = layout.groundY + (obj.side === 'far' ? 4 : 14);
    ctx.save();
    ctx.translate(obj.x, yBase);
    ctx.scale(obj.sc, obj.sc);
    if      (obj.type === 'acacia') drawAcaciaTree();
    else if (obj.type === 'rock')   drawSceneryRock();
    else                            drawSceneryShrub();
    ctx.restore();
  });
}

function drawAcaciaTree() {
  // Trunk
  ctx.fillStyle = C.treeTrunk;
  ctx.fillRect(-4, -65, 8, 65);
  // Flat-topped canopy (characteristic of African acacias)
  ctx.fillStyle = '#2A5225';
  ctx.beginPath(); ctx.ellipse(0, -68, 42, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.treeCrown;
  ctx.beginPath(); ctx.ellipse(0, -72, 33, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4E8E44';
  ctx.beginPath(); ctx.ellipse(0, -74,  22, 8, 0, 0, Math.PI * 2); ctx.fill();
}

function drawSceneryRock() {
  ctx.fillStyle = '#9A8878';
  ctx.beginPath(); ctx.ellipse(0,  -10, 24, 14, 0,     0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#B2A090';
  ctx.beginPath(); ctx.ellipse(-5, -13, 14,  9, -0.25, 0, Math.PI * 2); ctx.fill();
}

function drawSceneryShrub() {
  ctx.fillStyle = C.bushMid;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(i * 13, -13, 11, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Lane guide dots ───────────────────────────────────────────

function drawLaneGuides() {
  const { W, laneY } = layout;
  laneY.forEach(y => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
    const spacing = 68;
    const offset  = scrollX % spacing;
    for (let x = -offset; x < W + spacing; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ── Obstacles ─────────────────────────────────────────────────

function drawObstacles() {
  obstacles.forEach(o => {
    const y = layout.laneY[o.lane];
    ctx.save();
    ctx.translate(o.x, y);
    if      (o.type === 'rock') drawRock();
    else if (o.type === 'bush') drawBush();
    else                        drawLog();
    ctx.restore();
  });
}

function drawRock() {
  const { obsW: w, obsH: h } = layout;
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath(); ctx.ellipse(3, 6, w * 0.52, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Rock body
  ctx.fillStyle = C.rockDark;
  ctx.beginPath(); ctx.ellipse(0, -h * 0.50, w * 0.50, h * 0.50, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.rockLight;
  ctx.beginPath(); ctx.ellipse(-w*0.12, -h*0.60, w * 0.28, h * 0.26, -0.3, 0, Math.PI * 2); ctx.fill();
}

function drawBush() {
  const { obsW: w, obsH: h } = layout;
  // Base stems
  ctx.fillStyle = C.bushDk;
  ctx.fillRect(-w * 0.45, -h * 0.18, w * 0.90, h * 0.18);
  // Round berry clusters
  const clusterColors = [C.bushDk, C.bushMid, '#9A7030'];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = clusterColors[i % clusterColors.length];
    ctx.beginPath();
    ctx.arc(-w * 0.40 + i * (w * 0.20), -h * 0.45, h * 0.26, 0, Math.PI * 2);
    ctx.fill();
  }
  // Thorny spines
  ctx.strokeStyle = '#2A1808';
  ctx.lineWidth   = 1.2;
  for (let i = 0; i < 7; i++) {
    const bx = -w * 0.35 + Math.random() * w * 0.70;
    const by = -h * 0.60 + Math.random() * h * 0.50;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 5, by - 9);
    ctx.stroke();
  }
}

function drawLog() {
  const { obsW: w, obsH: h } = layout;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(2, 5, w * 0.6, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Log cylinder
  ctx.fillStyle = '#7A4A18';
  ctx.beginPath();
  ctx.roundRect(-w * 0.55, -h * 0.40, w * 1.10, h * 0.40, 6);
  ctx.fill();
  // Wood grain lines
  ctx.strokeStyle = 'rgba(50,25,5,0.30)';
  ctx.lineWidth   = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.45 + i * (w * 0.28), -h * 0.38);
    ctx.lineTo(-w * 0.45 + i * (w * 0.28), -h * 0.02);
    ctx.stroke();
  }
  // End cap
  ctx.fillStyle = '#5A3408';
  ctx.beginPath(); ctx.ellipse(-w * 0.55, -h * 0.20, w * 0.12, h * 0.20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( w * 0.55, -h * 0.20, w * 0.12, h * 0.20, 0, 0, Math.PI * 2); ctx.fill();
}

// ── Collectibles ──────────────────────────────────────────────

function drawCollectibles() {
  collectibles.forEach(c => {
    const bobY = Math.sin(c.bob) * 5; // gentle up-down float
    ctx.save();
    ctx.translate(c.x, layout.laneY[c.lane] + bobY);
    if (c.type === 'drop') drawWaterDrop();
    else                   drawJerrican();
    ctx.restore();
  });
}

function drawWaterDrop() {
  const r = layout.dropR;
  // Glow halo
  const glo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
  glo.addColorStop(0,   'rgba(0,159,227,0.35)');
  glo.addColorStop(1,   'rgba(0,159,227,0)');
  ctx.fillStyle = glo;
  ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();

  // Drop shape: circle body + pointed top
  ctx.fillStyle = C.blue;
  ctx.beginPath();
  ctx.arc(0, r * 0.25, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, r * 0.25);
  ctx.lineTo(0, -r * 0.95);
  ctx.lineTo( r * 0.55, r * 0.25);
  ctx.fill();

  // Shine highlight
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.10, r * 0.22, r * 0.35, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawJerrican() {
  const w = layout.jerW;
  const h = layout.jerH;
  // Glow
  ctx.fillStyle = 'rgba(255,201,7,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.30, w * 1.1, h * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = C.yellow;
  ctx.beginPath();
  ctx.roundRect(-w * 0.50, -h * 0.85, w, h * 0.85, 5);
  ctx.fill();
  // Handle
  ctx.fillStyle = '#D4A500';
  ctx.fillRect(-w * 0.12, -h, w * 0.24, h * 0.22);
  // Cap
  ctx.fillStyle = '#B08800';
  ctx.fillRect(-w * 0.18, -h * 0.88, w * 0.36, h * 0.10);
  // Blue water-label band
  ctx.fillStyle = C.blue;
  ctx.fillRect(-w * 0.44, -h * 0.45, w * 0.88, h * 0.18);
  // Drop icon on label
  ctx.fillStyle = '#fff';
  ctx.font       = `bold ${Math.round(w * 0.55)}px sans-serif`;
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💧', 0, -h * 0.365);
}

// ── Player character ──────────────────────────────────────────

function drawPlayer() {
  // Blink effect during post-hit invincibility
  if (player.blink > 0 && Math.floor(player.blink / 4) % 2 === 0) return;

  const { playerX: x, playerW: w, playerH: h } = layout;
  const px = x;
  const py = player.y; // feet Y

  ctx.save();
  ctx.translate(px, py);

  // Running leg animation: legs alternate using a sine wave
  const legSwing = Math.sin(frame * 0.28) * 10;

  // Drop shadow under feet
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(w * 0.50, 5, w * 0.48, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Legs ──
  ctx.strokeStyle = C.trousers;
  ctx.lineWidth   = w * 0.22;
  ctx.lineCap     = 'round';
  // Left leg
  ctx.beginPath();
  ctx.moveTo(w * 0.38, -h * 0.30);
  ctx.lineTo(w * 0.25,  legSwing > 0 ? -legSwing : 0);
  ctx.stroke();
  // Right leg
  ctx.beginPath();
  ctx.moveTo(w * 0.62, -h * 0.30);
  ctx.lineTo(w * 0.75,  legSwing < 0 ? legSwing : 0);
  ctx.stroke();

  // ── Shoes ──
  ctx.fillStyle = C.shoe;
  ctx.beginPath(); ctx.ellipse(w * 0.23,  legSwing > 0 ? -legSwing + 4 : 4,  w*0.24, h*0.06, 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w * 0.77,  legSwing < 0 ?  legSwing + 4 : 4,  w*0.24, h*0.06, -0.25, 0, Math.PI * 2); ctx.fill();

  // ── Body (shirt) ──
  ctx.fillStyle = C.shirt;
  ctx.beginPath();
  ctx.roundRect(w * 0.16, -h * 0.70, w * 0.68, h * 0.40, 5);
  ctx.fill();

  // ── Arms ──
  ctx.strokeStyle = C.skin;
  ctx.lineWidth   = w * 0.18;
  // Left arm (swings opposite to right leg)
  ctx.beginPath();
  ctx.moveTo(w * 0.16, -h * 0.60);
  ctx.lineTo(w * 0.02 + (legSwing > 0 ? legSwing * 0.4 : 0), -h * 0.38);
  ctx.stroke();
  // Right arm
  ctx.beginPath();
  ctx.moveTo(w * 0.84, -h * 0.60);
  ctx.lineTo(w * 0.98 - (legSwing < 0 ? legSwing * 0.4 : 0), -h * 0.38);
  ctx.stroke();

  // ── Head ──
  ctx.fillStyle = C.skin;
  ctx.beginPath();
  ctx.arc(w * 0.50, -h * 0.82, w * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = C.hair;
  ctx.beginPath();
  ctx.arc(w * 0.50, -h * 0.88, w * 0.32, Math.PI, 0);
  ctx.fill();

  // Eyes
  ctx.fillStyle = C.dark;
  ctx.beginPath(); ctx.arc(w * 0.38, -h * 0.83, w * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.62, -h * 0.83, w * 0.07, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ── Particles ─────────────────────────────────────────────────

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / 50;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}


// ────────────────────────────────────────────────────────────────
// 13. MAIN GAME LOOP & BUTTON WIRING
// ────────────────────────────────────────────────────────────────

/** The core loop — runs at ~60 fps via requestAnimationFrame */
function gameLoop() {
  if (state === 'playing') update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ── Start button ──────────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('dropBadge').classList.remove('hidden');
  initGame();
  state = 'playing';
});

// ── Restart button ────────────────────────────────────────────
document.getElementById('restartBtn').addEventListener('click', () => {
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('dropBadge').classList.remove('hidden');
  initGame();
  state = 'playing';
});

// ── Kick everything off ───────────────────────────────────────
state = 'start';
gameLoop();
