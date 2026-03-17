"use strict";

// === DOM References ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const locationValue = document.getElementById("locationValue");
const scoreValue = document.getElementById("scoreValue");
const dropsValue = document.getElementById("dropsValue");
const jerryValue = document.getElementById("jerryValue");
const livesValue = document.getElementById("livesValue");
const messageValue = document.getElementById("messageValue");

const campaignStatus = document.getElementById("campaignStatus");
const campaignNext = document.getElementById("campaignNext");
const campaignRoute = document.getElementById("campaignRoute");
const campaignGoal = document.getElementById("campaignGoal");
const missionValue = document.getElementById("missionValue");

const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const restartButton = document.getElementById("restartButton");
const continueButton = document.getElementById("continueButton");

const startOverlay = document.getElementById("startOverlay");
const levelCompleteOverlay = document.getElementById("levelCompleteOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");

const levelCompleteTitle = document.getElementById("levelCompleteTitle");
const levelCompleteText = document.getElementById("levelCompleteText");
const gameOverTitle = document.getElementById("gameOverTitle");
const finalStats = document.getElementById("finalStats");

const levelIntro = document.getElementById("levelIntro");
const levelIntroTitle = document.getElementById("levelIntroTitle");
const levelIntroText = document.getElementById("levelIntroText");

const leftTouch = document.getElementById("leftTouch");
const rightTouch = document.getElementById("rightTouch");

// === Campaign Data ===
// Expand this list to add more campaign stops later.
const CAMPAIGN_LEVELS = [
  {
    location: "Village in Kenya",
    country: "Kenya",
    introTitle: "Village in Kenya",
    introText: "First stop: collect resources and move clean water forward.",
    mission: {
      type: "drops",
      target: 20,
      label: "Collect 20 water drops"
    },
    targetDistance: 920,
    baseSpeed: 0.62,
    speedCap: 1.06,
    theme: {
      accent: "#FFC907",
      skyTop: "rgba(119, 168, 187, 0.86)",
      skyMid: "#FFF7E1",
      skyBottom: "#FFF7E1",
      sun: "#FFC907",
      hills: "rgba(119, 168, 187, 0.82)",
      hillsSecondary: "rgba(0, 51, 102, 0.26)",
      track: "#003366",
      trackLines: "rgba(255, 247, 225, 0.34)"
    }
  },
  {
    location: "Rural Uganda",
    country: "Uganda",
    introTitle: "Rural Uganda",
    introText: "Second stop: carry momentum and reach the next village.",
    mission: {
      type: "distance",
      target: 1040,
      label: "Reach the next village"
    },
    targetDistance: 1040,
    baseSpeed: 0.65,
    speedCap: 1.12,
    theme: {
      accent: "#FFC907",
      skyTop: "rgba(119, 168, 187, 0.92)",
      skyMid: "#FFF7E1",
      skyBottom: "#FFF7E1",
      sun: "#FFC907",
      hills: "rgba(119, 168, 187, 0.9)",
      hillsSecondary: "rgba(0, 51, 102, 0.32)",
      track: "#003366",
      trackLines: "rgba(255, 247, 225, 0.28)"
    }
  },
  {
    location: "Northern Tanzania",
    country: "Tanzania",
    introTitle: "Northern Tanzania",
    introText: "Third stop: move supplies quickly and deliver water support.",
    mission: {
      type: "jerry",
      target: 3,
      label: "Deliver 3 jerry cans"
    },
    targetDistance: 1180,
    baseSpeed: 0.68,
    speedCap: 1.18,
    theme: {
      accent: "#FFC907",
      skyTop: "rgba(119, 168, 187, 0.8)",
      skyMid: "#FFF7E1",
      skyBottom: "#FFF7E1",
      sun: "#FFC907",
      hills: "rgba(119, 168, 187, 0.75)",
      hillsSecondary: "rgba(0, 51, 102, 0.38)",
      track: "#003366",
      trackLines: "rgba(255, 247, 225, 0.3)"
    }
  },
  {
    location: "Zambia Community Route",
    country: "Zambia",
    introTitle: "Zambia Community Route",
    introText: "Fourth stop: scale up impact across the community route.",
    mission: {
      type: "drops",
      target: 24,
      label: "Collect 24 water drops"
    },
    targetDistance: 1300,
    baseSpeed: 0.71,
    speedCap: 1.24,
    theme: {
      accent: "#FFC907",
      skyTop: "rgba(119, 168, 187, 0.72)",
      skyMid: "#FFF7E1",
      skyBottom: "#FFF7E1",
      sun: "#FFC907",
      hills: "rgba(119, 168, 187, 0.68)",
      hillsSecondary: "rgba(0, 51, 102, 0.44)",
      track: "#003366",
      trackLines: "rgba(255, 247, 225, 0.26)"
    }
  },
  {
    location: "Final Celebration Village in Ethiopia",
    country: "Ethiopia",
    introTitle: "Final Celebration Village",
    introText: "Final stop: finish strong and celebrate shared progress.",
    mission: {
      type: "jerry",
      target: 5,
      label: "Deliver 5 jerry cans"
    },
    targetDistance: 1420,
    baseSpeed: 0.74,
    speedCap: 1.3,
    theme: {
      accent: "#FFC907",
      skyTop: "rgba(119, 168, 187, 0.78)",
      skyMid: "#FFF7E1",
      skyBottom: "#FFF7E1",
      sun: "#FFC907",
      hills: "rgba(119, 168, 187, 0.84)",
      hillsSecondary: "rgba(0, 51, 102, 0.3)",
      track: "#003366",
      trackLines: "rgba(255, 247, 225, 0.38)"
    }
  }
];

// === Runtime Constants ===
const CELEBRATION_COLORS = ["#FFC907", "#003366", "#77A8BB", "#FFF7E1"];
const WATER_DROP_COLORS = ["#77A8BB", "#4F90A8", "#BEE5F2", "#EAFBFF"];
const TOUCH_HOLD_INTERVAL_MS = 130;
const OBSTACLE_TYPES = ["rock", "mud", "marker", "barrier"];

// Gameplay readability palette: intentionally high contrast for obstacle clarity.
const GAMEPLAY_COLORS = {
  trackSurfaceTop: "#B68657",
  trackSurfaceBottom: "#85542F",
  trackEdge: "#6A4328",
  rutShadow: "rgba(70, 45, 27, 0.72)",
  rutHighlight: "rgba(194, 150, 108, 0.54)",
  gravelLight: "rgba(224, 192, 153, 0.48)",
  gravelDark: "rgba(94, 63, 40, 0.45)",
  obstacleOutline: "#F6FBFF",
  mud: "#7A4E39",
  mudHighlight: "#C58A68",
  rock: "#D6E6F2",
  rockShadow: "#6E8599",
  markerPole: "#F5F8FC",
  markerTop: "#FF4F7E",
  markerStripe: "#1A2235",
  barrierBody: "#FF6B35",
  barrierStripeDark: "#101828",
  barrierStripeLight: "#FFE15D",
  pickupDrop: "#3AA6D0",
  pickupDropHighlight: "rgba(255, 255, 255, 0.78)",
  pickupJerry: "#FFD34A"
};

const LANE_COUNT = 3;
const HORIZON_Y = 120;
const TRACK_END_Y = canvas.height - 40;

const routeStopElements = [];

// === Mutable Game State ===
const gameState = {
  running: false,
  playerLane: 1,
  speed: 0.62,
  speedCap: 1.06,
  distance: 0,
  totalDistance: 0,
  score: 0,
  scoreAtLevelStart: 0,
  lives: 3,
  efficiency: 100,
  obstacles: [],
  pickups: [],
  obstacleSpawnTimer: 0,
  pickupSpawnTimer: 0,
  pauseTimer: 0,
  lanePulse: 0,
  animationFrameId: 0,
  previousTime: 0,
  flashAlpha: 0,
  shakeTimer: 0,
  efficiencyAlertTimer: 0,
  campaignIndex: 0,
  pendingLevelIndex: null,
  unlockedStops: 1,
  completedStops: 0,
  levelDropsCollected: 0,
  levelJerriesCollected: 0,
  celebrationParticles: [],
  celebrationActive: false,
  celebrationElapsed: 0,
  introTimer: 0,
  campaignFinished: false
};

// Keep track of held touch buttons for smooth lane movement.
const touchHoldTimers = {
  left: 0,
  right: 0
};

// === Shared Helpers ===
function getCurrentLevel() {
  return CAMPAIGN_LEVELS[gameState.campaignIndex];
}

function getMapActiveIndex() {
  if (gameState.pendingLevelIndex !== null) {
    return gameState.pendingLevelIndex;
  }
  return gameState.campaignIndex;
}

function setMessage(text) {
  messageValue.textContent = text;
}

function popHudValue(element) {
  if (!element) {
    return;
  }

  element.classList.remove("value-pop");
  // Force a reflow so repeated updates can replay the animation.
  void element.offsetWidth;
  element.classList.add("value-pop");
}

function updateValueText(element, valueText, animate = false) {
  if (!element) {
    return;
  }

  if (element.textContent === valueText) {
    return;
  }

  element.textContent = valueText;
  if (animate) {
    popHudValue(element);
  }
}

function createCelebrationParticle(startY = -20) {
  const isDrop = Math.random() < 0.36;
  const size = isDrop ? 6 + Math.random() * 7 : 4 + Math.random() * 6;

  return {
    x: Math.random() * canvas.width,
    y: startY,
    vx: -80 + Math.random() * 160,
    vy: isDrop ? 82 + Math.random() * 120 : 95 + Math.random() * 145,
    gravity: isDrop ? 150 + Math.random() * 115 : 190 + Math.random() * 130,
    rotation: Math.random() * Math.PI,
    spin: -5 + Math.random() * 10,
    size,
    life: isDrop ? 2.8 + Math.random() * 1.9 : 2.4 + Math.random() * 1.8,
    shape: isDrop ? "drop" : "confetti",
    color: isDrop
      ? WATER_DROP_COLORS[Math.floor(Math.random() * WATER_DROP_COLORS.length)]
      : CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)]
  };
}

function startCelebration() {
  gameState.celebrationActive = true;
  gameState.celebrationElapsed = 0;
  gameState.celebrationParticles = [];

  for (let i = 0; i < 90; i += 1) {
    gameState.celebrationParticles.push(createCelebrationParticle(-Math.random() * canvas.height * 0.35));
  }
}

function stopCelebration() {
  gameState.celebrationActive = false;
  gameState.celebrationElapsed = 0;
  gameState.celebrationParticles = [];
}

function updateCelebration(dt) {
  if (!gameState.celebrationActive) {
    return;
  }

  gameState.celebrationElapsed += dt;

  // Keep the celebration lively for a few seconds, then let particles fade naturally.
  if (gameState.celebrationElapsed < 5.2) {
    for (let i = 0; i < 5; i += 1) {
      gameState.celebrationParticles.push(createCelebrationParticle(-10));
    }
  }

  for (const particle of gameState.celebrationParticles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += particle.gravity * dt;
    particle.rotation += particle.spin * dt;
    particle.life -= dt;
  }

  gameState.celebrationParticles = gameState.celebrationParticles.filter((particle) => {
    return (
      particle.life > 0 &&
      particle.y < canvas.height + 40 &&
      particle.x > -40 &&
      particle.x < canvas.width + 40
    );
  });

  if (gameState.celebrationElapsed > 6 && gameState.celebrationParticles.length === 0) {
    stopCelebration();
  }
}

function getMissionSnapshot(level = getCurrentLevel()) {
  const mission = level.mission;

  if (mission.type === "drops") {
    const current = gameState.levelDropsCollected;
    return {
      label: mission.label,
      progressText: `${current}/${mission.target}`,
      done: current >= mission.target
    };
  }

  if (mission.type === "jerry") {
    const current = gameState.levelJerriesCollected;
    return {
      label: mission.label,
      progressText: `${current}/${mission.target}`,
      done: current >= mission.target
    };
  }

  const target = mission.target || level.targetDistance;
  const current = Math.floor(gameState.distance);

  return {
    label: mission.label,
    progressText: `${Math.min(current, target)}/${target} m`,
    done: current >= target
  };
}

function updateMissionLabel() {
  if (!missionValue) {
    return;
  }

  const mission = getMissionSnapshot();
  missionValue.textContent = `${mission.label} (${mission.progressText})`;
}

// === Campaign Flow ===
function buildCampaignRoute() {
  campaignRoute.innerHTML = "";
  routeStopElements.length = 0;

  CAMPAIGN_LEVELS.forEach((level, index) => {
    const stop = document.createElement("li");
    stop.className = "route-stop";
    stop.innerHTML = `
      <p class="route-step">Stop ${index + 1}</p>
      <p class="route-name">${level.location}</p>
      <p class="route-country">${level.country}</p>
    `;

    routeStopElements.push(stop);
    campaignRoute.appendChild(stop);
  });
}

function updateCampaignRoute() {
  const totalStops = CAMPAIGN_LEVELS.length;
  const activeIndex = gameState.campaignFinished ? -1 : getMapActiveIndex();

  routeStopElements.forEach((stop, index) => {
    const completed = index < gameState.completedStops;
    const unlocked = index < gameState.unlockedStops;
    const active = index === activeIndex && !completed;

    stop.classList.toggle("completed", completed);
    stop.classList.toggle("active", active);
    stop.classList.toggle("unlocked", unlocked && !completed);
    stop.classList.toggle("locked", !unlocked);
  });

  if (gameState.campaignFinished) {
    campaignStatus.textContent = `All ${totalStops} stops complete`;
    if (campaignNext) {
      campaignNext.textContent = `Completed villages: ${totalStops} | Next destination: Celebration complete`;
    }
    campaignGoal.textContent =
      "Goal achieved: every campaign location completed and final-village water delivery fulfilled.";
  } else {
    const displayIndex = activeIndex + 1;
    const displayLevel = CAMPAIGN_LEVELS[activeIndex];
    campaignStatus.textContent = `Stop ${displayIndex} of ${totalStops}: ${displayLevel.location}`;

    if (campaignNext) {
      const nextIndex = Math.min(gameState.completedStops, totalStops - 1);
      const nextLevel = CAMPAIGN_LEVELS[nextIndex];
      campaignNext.textContent =
        `Completed villages: ${gameState.completedStops} | Next destination: ${nextLevel.location}`;
    }

    campaignGoal.textContent =
      `Goal: complete all campaign locations and deliver enough water resources to the final village (${gameState.completedStops}/${totalStops} reached).`;
  }
}

function hasMetFinalVillageWinCondition() {
  const finalIndex = CAMPAIGN_LEVELS.length - 1;
  if (gameState.campaignIndex !== finalIndex) {
    return false;
  }

  if (gameState.completedStops < CAMPAIGN_LEVELS.length) {
    return false;
  }

  const mission = getMissionSnapshot(CAMPAIGN_LEVELS[finalIndex]);
  return mission.done;
}

function applyLevelTheme(level) {
  document.documentElement.style.setProperty("--level-accent", level.theme.accent);
}

function showLevelIntro(level) {
  const mission = getMissionSnapshot(level);
  levelIntroTitle.textContent = level.introTitle;
  levelIntroText.textContent = `${level.introText} Mission: ${mission.label}.`;
  levelIntro.classList.add("visible");
  gameState.introTimer = 2.5;
}

function hideLevelIntro() {
  levelIntro.classList.remove("visible");
  gameState.introTimer = 0;
}

function hideOverlays() {
  startOverlay.classList.remove("visible");
  levelCompleteOverlay.classList.remove("visible");
  gameOverOverlay.classList.remove("victory");
  gameOverOverlay.classList.remove("visible");
}

function resetWorldForLevel(level) {
  gameState.running = false;
  gameState.playerLane = 1;
  gameState.speed = level.baseSpeed;
  gameState.speedCap = level.speedCap;
  gameState.distance = 0;
  gameState.lives = 3;
  gameState.efficiency = 100;
  gameState.obstacles = [];
  gameState.pickups = [];
  gameState.obstacleSpawnTimer = 0.6;
  gameState.pickupSpawnTimer = 0.9;
  gameState.pauseTimer = 0;
  gameState.lanePulse = 0;
  gameState.previousTime = 0;
  gameState.flashAlpha = 0;
  gameState.shakeTimer = 0;
  gameState.efficiencyAlertTimer = 0;
  gameState.levelDropsCollected = 0;
  gameState.levelJerriesCollected = 0;
  stopCelebration();
}

function loadLevel(index, options = {}) {
  const { resetScore = false, showIntro = true } = options;

  gameState.campaignIndex = index;
  gameState.pendingLevelIndex = null;
  gameState.campaignFinished = false;

  if (resetScore) {
    gameState.score = 0;
    gameState.totalDistance = 0;
  }

  const level = getCurrentLevel();
  resetWorldForLevel(level);
  gameState.scoreAtLevelStart = gameState.score;

  applyLevelTheme(level);
  updateCampaignRoute();
  updateHud();

  if (showIntro) {
    showLevelIntro(level);
  } else {
    hideLevelIntro();
  }

  setMessage(`${level.introText} ${level.mission.label}.`);
}

function startLoadedLevel() {
  hideOverlays();
  gameState.running = true;
  gameState.previousTime = 0;
  stopAllTouchHolds();
  stopCelebration();
}

function resetCampaign() {
  stopAllTouchHolds();
  stopCelebration();
  gameOverTitle.textContent = "Run Summary";
  restartButton.textContent = "Try Again";
  gameOverOverlay.classList.remove("victory");

  // Reset starts a fresh run immediately from the first campaign stop.
  startCampaign();
  setMessage("Campaign reset. Back to the first village.");
}

function startCampaign() {
  gameState.completedStops = 0;
  gameState.unlockedStops = 1;
  gameState.pendingLevelIndex = null;
  gameState.campaignFinished = false;

  loadLevel(0, { resetScore: true, showIntro: true });
  startLoadedLevel();
  startButton.textContent = "Restart Campaign";

  setMessage("Campaign started. Deliver water resources to each village.");
}

function continueToNextLevel() {
  if (gameState.pendingLevelIndex === null) {
    return;
  }

  loadLevel(gameState.pendingLevelIndex, { resetScore: false, showIntro: true });
  startLoadedLevel();
}

function retryCurrentLevel() {
  gameState.score = gameState.scoreAtLevelStart;
  loadLevel(gameState.campaignIndex, { resetScore: false, showIntro: true });
  startLoadedLevel();
}

function handleRestartButton() {
  if (gameState.campaignFinished) {
    startCampaign();
    return;
  }

  retryCurrentLevel();
}

function completeCampaign() {
  if (!hasMetFinalVillageWinCondition()) {
    return;
  }

  const finalLevel = CAMPAIGN_LEVELS[CAMPAIGN_LEVELS.length - 1];
  const finalTarget = finalLevel.mission.target;

  gameState.running = false;
  gameState.campaignFinished = true;
  gameState.pendingLevelIndex = null;
  gameState.completedStops = CAMPAIGN_LEVELS.length;
  gameState.unlockedStops = CAMPAIGN_LEVELS.length;
  stopAllTouchHolds();

  updateCampaignRoute();
  hideLevelIntro();
  startCelebration();

  gameOverTitle.textContent = "Victory! Final Village Reached";
  finalStats.textContent =
    `You helped bring hope from village to village. Final score: ${Math.floor(gameState.score)}. Total communities reached: ${gameState.completedStops}. Final village water delivery: ${gameState.levelJerriesCollected}/${finalTarget} jerry cans.`;
  restartButton.textContent = "Play Again";
  gameOverOverlay.classList.add("visible", "victory");

  setMessage("You helped bring hope from village to village. Celebration time.");
}

function completeLevel() {
  gameState.running = false;
  gameState.completedStops = Math.max(gameState.completedStops, gameState.campaignIndex + 1);
  stopAllTouchHolds();

  if (gameState.completedStops >= CAMPAIGN_LEVELS.length) {
    if (!hasMetFinalVillageWinCondition()) {
      gameState.running = true;
      setMessage("Final village still needs more water resources before the campaign can be won.");
      return;
    }

    completeCampaign();
    return;
  }

  gameState.unlockedStops = Math.min(
    CAMPAIGN_LEVELS.length,
    Math.max(gameState.unlockedStops, gameState.completedStops + 1)
  );

  const nextIndex = gameState.completedStops;
  const nextLevel = CAMPAIGN_LEVELS[nextIndex];

  gameState.pendingLevelIndex = nextIndex;
  updateCampaignRoute();

  levelCompleteTitle.textContent = "Village Complete";
  levelCompleteText.textContent =
    `Water delivered. Next village unlocked: ${nextLevel.location}.`;
  levelCompleteOverlay.classList.add("visible");

  setMessage(`Village complete. Next village unlocked: ${nextLevel.location}.`);
}

function failLevel() {
  const level = getCurrentLevel();

  gameState.running = false;
  gameState.pendingLevelIndex = null;
  stopAllTouchHolds();
  hideLevelIntro();

  gameOverTitle.textContent = `Run Ended - ${level.location}`;
  finalStats.textContent =
    `Great run so far: ${Math.floor(gameState.distance)} meters and ${Math.floor(gameState.score)} points.`;
  restartButton.textContent = "Try Again";
  gameOverOverlay.classList.remove("victory");
  gameOverOverlay.classList.add("visible");

  setMessage("Good effort. Try again to deliver more water.");
}

function updateHud() {
  const level = getCurrentLevel();
  const nextScore = Math.floor(gameState.score);
  const previousScore = Number(scoreValue.textContent || "0");

  updateValueText(locationValue, level.location, false);
  updateValueText(scoreValue, String(nextScore), nextScore - previousScore >= 5);
  updateValueText(dropsValue, String(gameState.levelDropsCollected), true);
  updateValueText(jerryValue, String(gameState.levelJerriesCollected), true);
  updateValueText(livesValue, String(gameState.lives), true);

  updateMissionLabel();

  if (gameState.lives <= 1) {
    livesValue.classList.add("danger");
  } else {
    livesValue.classList.remove("danger");
  }
}

// === Input Handling ===
function movePlayer(direction) {
  if (!gameState.running) {
    return;
  }

  gameState.playerLane = Math.max(0, Math.min(LANE_COUNT - 1, gameState.playerLane + direction));
}

function stopTouchHold(controlKey) {
  if (touchHoldTimers[controlKey]) {
    window.clearInterval(touchHoldTimers[controlKey]);
    touchHoldTimers[controlKey] = 0;
  }
}

function stopAllTouchHolds() {
  stopTouchHold("left");
  stopTouchHold("right");
}

function bindTouchLaneControl(button, direction, controlKey) {
  const startMove = (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    movePlayer(direction);
    stopTouchHold(controlKey);
    touchHoldTimers[controlKey] = window.setInterval(() => {
      movePlayer(direction);
    }, TOUCH_HOLD_INTERVAL_MS);
  };

  const stopMove = () => {
    stopTouchHold(controlKey);
  };

  button.addEventListener("pointerdown", startMove);
  button.addEventListener("pointerup", stopMove);
  button.addEventListener("pointercancel", stopMove);
  button.addEventListener("pointerleave", stopMove);
}

function bindActionButton(button, handler) {
  let lastTriggerTime = 0;

  const trigger = () => {
    const now = performance.now();
    if (now - lastTriggerTime < 220) {
      return;
    }

    lastTriggerTime = now;
    handler();
  };

  button.addEventListener("click", trigger);
  button.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      event.preventDefault();
      trigger();
    }
  });
}

function randomLane() {
  return Math.floor(Math.random() * LANE_COUNT);
}

// === World Spawning & Collisions ===
function pickObstacleType() {
  const difficulty = gameState.campaignIndex / (CAMPAIGN_LEVELS.length - 1);
  const mudChance = Math.max(0.14, 0.34 - difficulty * 0.15);
  const rockChance = 0.28;
  const markerChance = 0.22 + difficulty * 0.1;
  const roll = Math.random();

  if (roll < mudChance) {
    return "mud";
  }

  if (roll < mudChance + rockChance) {
    return "rock";
  }

  if (roll < mudChance + rockChance + markerChance) {
    return "marker";
  }

  return "barrier";
}

function createObstacle(type, lane) {
  const baseShape = {
    rock: { width: 50, height: 42 },
    mud: { width: 68, height: 24 },
    marker: { width: 44, height: 58 },
    barrier: { width: 88, height: 54 }
  };

  const safeType = OBSTACLE_TYPES.includes(type) ? type : "rock";
  const shape = baseShape[safeType] || baseShape.rock;

  return {
    lane,
    type: safeType,
    depth: 0,
    width: shape.width,
    height: shape.height
  };
}

function nextObstacleSpawnDelay() {
  const levelPressure = gameState.campaignIndex * 0.08;
  const speedPressure = Math.max(0, gameState.speed - 0.62) * 0.35;
  const min = Math.max(0.34, 0.72 - levelPressure - speedPressure);
  const max = Math.max(min + 0.18, 1.02 - levelPressure - speedPressure);
  return min + Math.random() * (max - min);
}

function nextPickupSpawnDelay() {
  const levelBoost = gameState.campaignIndex * 0.03;
  const min = Math.max(0.56, 0.88 - levelBoost);
  const max = Math.max(min + 0.35, 1.42 - levelBoost);
  return min + Math.random() * (max - min);
}

function maybeSpawnObstacle(dt) {
  gameState.obstacleSpawnTimer -= dt;
  if (gameState.obstacleSpawnTimer > 0) {
    return;
  }

  gameState.obstacleSpawnTimer = nextObstacleSpawnDelay();
  const firstLane = randomLane();
  const firstType = pickObstacleType();
  gameState.obstacles.push(createObstacle(firstType, firstLane));

  const secondChance = 0.05 + gameState.campaignIndex * 0.08;
  if (Math.random() < secondChance) {
    const availableLanes = [0, 1, 2].filter((lane) => lane !== firstLane);
    const secondLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    const secondType = pickObstacleType();
    gameState.obstacles.push(createObstacle(secondType, secondLane));
  }
}

function maybeSpawnPickup(dt) {
  gameState.pickupSpawnTimer -= dt;
  if (gameState.pickupSpawnTimer > 0) {
    return;
  }

  gameState.pickupSpawnTimer = nextPickupSpawnDelay();
  const collectibleType = Math.random() < 0.3 ? "jerry" : "drop";

  gameState.pickups.push({
    lane: randomLane(),
    depth: 0,
    type: collectibleType,
    radius: collectibleType === "jerry" ? 20 : 18
  });
}

function applyMissedCollectiblePenalty() {
  let efficiencyLoss = 0;

  for (const pickup of gameState.pickups) {
    if (pickup.depth > 1.15 && pickup.depth < 2) {
      efficiencyLoss += pickup.type === "jerry" ? 4 : 2;
    }
  }

  if (efficiencyLoss <= 0) {
    return;
  }

  gameState.efficiency = Math.max(45, gameState.efficiency - efficiencyLoss);

  if (gameState.efficiencyAlertTimer <= 0) {
    setMessage("A few resources were missed. Efficiency dropped slightly.");
    gameState.efficiencyAlertTimer = 1.2;
  }
}

function depthToY(depth) {
  // This non-linear curve makes objects appear to rush toward the player.
  return HORIZON_Y + Math.pow(depth, 1.68) * (TRACK_END_Y - HORIZON_Y);
}

function laneX(lane, depth) {
  const centerX = canvas.width / 2;
  const farSpacing = 34;
  const nearSpacing = 210;
  const spacing = farSpacing + (nearSpacing - farSpacing) * depth;
  return centerX + (lane - 1) * spacing;
}

function handleCollisions() {
  const hitDepthStart = 0.9;
  const hitDepthEnd = 1.05;

  for (const obstacle of gameState.obstacles) {
    if (
      obstacle.depth > hitDepthStart &&
      obstacle.depth < hitDepthEnd &&
      obstacle.lane === gameState.playerLane
    ) {
      obstacle.depth = 2;
      gameState.shakeTimer = 0.22;
      gameState.flashAlpha = 0.5;

      if (obstacle.type === "mud") {
        gameState.pauseTimer = Math.max(gameState.pauseTimer, 0.55);
        gameState.efficiency = Math.max(45, gameState.efficiency - 3);
        setMessage("Mud patch hit. Quick slowdown, then back to pace.");
      } else {
        gameState.lives -= 1;
        gameState.efficiency = Math.max(45, gameState.efficiency - 5);

        if (gameState.lives <= 0) {
          failLevel();
          return true;
        }

        const obstacleLabel = {
          rock: "rock",
          marker: "broken marker",
          barrier: "barrier",
          mud: "mud patch"
        };
        setMessage(`You hit a ${obstacleLabel[obstacle.type] || "hazard"}. Keep moving!`);
      }
      break;
    }
  }

  for (const pickup of gameState.pickups) {
    if (
      pickup.depth > hitDepthStart &&
      pickup.depth < hitDepthEnd &&
      pickup.lane === gameState.playerLane
    ) {
      pickup.depth = 2;

      if (pickup.type === "jerry") {
        gameState.levelJerriesCollected += 1;
        gameState.score += 20;
        setMessage("Water delivered. Hope restored with this jerry can.");
      } else {
        gameState.levelDropsCollected += 1;
        gameState.score += 10;
        setMessage("Water delivered. Keep moving toward the next village.");
      }
    }
  }

  return false;
}

function updateWorld(dt) {
  const level = getCurrentLevel();

  if (gameState.pauseTimer > 0) {
    gameState.pauseTimer = Math.max(0, gameState.pauseTimer - dt);
    gameState.lanePulse += dt * 1.6;

    if (gameState.flashAlpha > 0) {
      gameState.flashAlpha = Math.max(0, gameState.flashAlpha - dt * 1.8);
    }

    if (gameState.shakeTimer > 0) {
      gameState.shakeTimer = Math.max(0, gameState.shakeTimer - dt);
    }

    if (gameState.efficiencyAlertTimer > 0) {
      gameState.efficiencyAlertTimer = Math.max(0, gameState.efficiencyAlertTimer - dt);
    }

    if (gameState.introTimer > 0) {
      gameState.introTimer = Math.max(0, gameState.introTimer - dt);
      if (gameState.introTimer === 0) {
        hideLevelIntro();
      }
    }

    updateHud();
    return;
  }

  const worldSpeed = gameState.speed;

  const travel = worldSpeed * dt * 170;
  gameState.distance += travel;
  gameState.totalDistance += travel;

  // Survival score: points rise as long as the player stays in the run.
  gameState.score += dt * 6 * (gameState.efficiency / 100);

  gameState.speed = Math.min(
    level.speedCap,
    gameState.speed + dt * (0.012 + gameState.campaignIndex * 0.0015)
  );
  gameState.lanePulse += dt * (3.2 + worldSpeed);

  maybeSpawnObstacle(dt);
  maybeSpawnPickup(dt);

  for (const obstacle of gameState.obstacles) {
    obstacle.depth += dt * worldSpeed * 0.95;
  }

  for (const pickup of gameState.pickups) {
    pickup.depth += dt * worldSpeed * 0.86;
  }

  applyMissedCollectiblePenalty();

  const runEnded = handleCollisions();

  gameState.obstacles = gameState.obstacles.filter((obstacle) => obstacle.depth <= 1.15);
  gameState.pickups = gameState.pickups.filter((pickup) => pickup.depth <= 1.15);

  if (runEnded) {
    updateHud();
    return;
  }

  const mission = getMissionSnapshot(level);
  if (mission.done) {
    completeLevel();
    updateHud();
    return;
  }

  if (gameState.flashAlpha > 0) {
    gameState.flashAlpha = Math.max(0, gameState.flashAlpha - dt * 1.7);
  }

  if (gameState.shakeTimer > 0) {
    gameState.shakeTimer = Math.max(0, gameState.shakeTimer - dt);
  }

  if (gameState.efficiencyAlertTimer > 0) {
    gameState.efficiencyAlertTimer = Math.max(0, gameState.efficiencyAlertTimer - dt);
  }

  if (gameState.introTimer > 0) {
    gameState.introTimer = Math.max(0, gameState.introTimer - dt);
    if (gameState.introTimer === 0) {
      hideLevelIntro();
    }
  }

  updateHud();
}

// === Rendering ===
function drawSkyAndHills() {
  const theme = getCurrentLevel().theme;

  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, theme.skyTop);
  skyGradient.addColorStop(0.52, theme.skyMid);
  skyGradient.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = theme.sun;
  ctx.beginPath();
  ctx.arc(150, 90, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = theme.hillsSecondary;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y + 55);
  ctx.bezierCurveTo(150, 100, 270, 165, 420, HORIZON_Y + 62);
  ctx.bezierCurveTo(560, 90, 720, 182, canvas.width, HORIZON_Y + 68);
  ctx.lineTo(canvas.width, HORIZON_Y + 125);
  ctx.lineTo(0, HORIZON_Y + 125);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = theme.hills;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y + 45);
  ctx.bezierCurveTo(170, 60, 280, 170, 430, HORIZON_Y + 40);
  ctx.bezierCurveTo(560, 70, 710, 175, canvas.width, HORIZON_Y + 30);
  ctx.lineTo(canvas.width, HORIZON_Y + 110);
  ctx.lineTo(0, HORIZON_Y + 110);
  ctx.closePath();
  ctx.fill();
}

function drawTrack() {
  const centerX = canvas.width / 2;
  const topWidth = 145;
  const bottomWidth = 740;
  const outerTopWidth = topWidth + 32;
  const outerBottomWidth = bottomWidth + 96;

  ctx.fillStyle = GAMEPLAY_COLORS.trackEdge;
  ctx.beginPath();
  ctx.moveTo(centerX - outerTopWidth / 2, HORIZON_Y);
  ctx.lineTo(centerX + outerTopWidth / 2, HORIZON_Y);
  ctx.lineTo(centerX + outerBottomWidth / 2, TRACK_END_Y + 50);
  ctx.lineTo(centerX - outerBottomWidth / 2, TRACK_END_Y + 50);
  ctx.closePath();
  ctx.fill();

  const dirtGradient = ctx.createLinearGradient(0, HORIZON_Y, 0, TRACK_END_Y + 50);
  dirtGradient.addColorStop(0, GAMEPLAY_COLORS.trackSurfaceTop);
  dirtGradient.addColorStop(1, GAMEPLAY_COLORS.trackSurfaceBottom);

  ctx.fillStyle = dirtGradient;
  ctx.beginPath();
  ctx.moveTo(centerX - topWidth / 2, HORIZON_Y);
  ctx.lineTo(centerX + topWidth / 2, HORIZON_Y);
  ctx.lineTo(centerX + bottomWidth / 2, TRACK_END_Y + 50);
  ctx.lineTo(centerX - bottomWidth / 2, TRACK_END_Y + 50);
  ctx.closePath();
  ctx.fill();

  // Subtle gravel speckles make the track read as a dirt path.
  const fract = (value) => value - Math.floor(value);
  for (let i = 0; i < 64; i += 1) {
    const depthSeed = fract(Math.sin((i + 1) * 12.9898) * 43758.5453);
    const sideSeed = fract(Math.sin((i + 1) * 78.233) * 24634.6345);
    const depth = 0.07 + depthSeed * 0.9;
    const spread = topWidth * 0.34 + (bottomWidth * 0.46 - topWidth * 0.34) * depth;
    const x = centerX + (sideSeed * 2 - 1) * spread;
    const y = depthToY(depth);
    const size = 0.8 + depth * 2.8;

    ctx.fillStyle = i % 2 === 0 ? GAMEPLAY_COLORS.gravelLight : GAMEPLAY_COLORS.gravelDark;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.7, sideSeed * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}


function drawObstacle(obstacle) {
  const y = depthToY(obstacle.depth);
  const x = laneX(obstacle.lane, obstacle.depth);
  const scale = 0.2 + obstacle.depth * 1.2;
  const width = obstacle.width * scale;
  const height = obstacle.height * scale;

  ctx.fillStyle = "rgba(6, 9, 14, 0.3)";
  ctx.beginPath();
  ctx.ellipse(x, y - height * 0.02, width * 0.48, height * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  if (obstacle.type === "mud") {
    ctx.fillStyle = GAMEPLAY_COLORS.mud;
    ctx.beginPath();
    ctx.ellipse(x, y - height * 0.45, width * 0.5, height * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GAMEPLAY_COLORS.obstacleOutline;
    ctx.lineWidth = Math.max(1.4, width * 0.045);
    ctx.stroke();

    ctx.fillStyle = GAMEPLAY_COLORS.mudHighlight;
    ctx.beginPath();
    ctx.ellipse(x - width * 0.08, y - height * 0.48, width * 0.26, height * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (obstacle.type === "rock") {
    ctx.fillStyle = GAMEPLAY_COLORS.rock;
    ctx.beginPath();
    ctx.moveTo(x - width * 0.45, y - height * 0.1);
    ctx.lineTo(x - width * 0.18, y - height * 0.9);
    ctx.lineTo(x + width * 0.24, y - height * 0.84);
    ctx.lineTo(x + width * 0.46, y - height * 0.24);
    ctx.lineTo(x + width * 0.2, y);
    ctx.lineTo(x - width * 0.3, y - height * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = GAMEPLAY_COLORS.rockShadow;
    ctx.lineWidth = Math.max(1.8, width * 0.06);
    ctx.stroke();

    ctx.fillStyle = GAMEPLAY_COLORS.rockShadow;
    ctx.beginPath();
    ctx.ellipse(x + width * 0.08, y - height * 0.5, width * 0.17, height * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
    ctx.beginPath();
    ctx.ellipse(x - width * 0.16, y - height * 0.52, width * 0.13, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (obstacle.type === "marker") {
    ctx.fillStyle = GAMEPLAY_COLORS.markerPole;
    ctx.fillRect(x - width * 0.12, y - height, width * 0.24, height);
    ctx.strokeStyle = GAMEPLAY_COLORS.markerStripe;
    ctx.lineWidth = Math.max(1.5, width * 0.05);
    ctx.strokeRect(x - width * 0.12, y - height, width * 0.24, height);

    ctx.fillStyle = GAMEPLAY_COLORS.markerTop;
    ctx.fillRect(x - width * 0.48, y - height * 0.82, width * 0.96, height * 0.34);
    ctx.strokeStyle = GAMEPLAY_COLORS.obstacleOutline;
    ctx.lineWidth = Math.max(1.2, width * 0.045);
    ctx.strokeRect(x - width * 0.48, y - height * 0.82, width * 0.96, height * 0.34);

    ctx.fillStyle = GAMEPLAY_COLORS.markerStripe;
    ctx.fillRect(x - width * 0.4, y - height * 0.74, width * 0.28, height * 0.1);
    ctx.fillRect(x + width * 0.1, y - height * 0.64, width * 0.24, height * 0.1);
    return;
  }

  // Barrier
  ctx.fillStyle = GAMEPLAY_COLORS.barrierBody;
  ctx.fillRect(x - width / 2, y - height, width, height * 0.34);
  ctx.strokeStyle = GAMEPLAY_COLORS.obstacleOutline;
  ctx.lineWidth = Math.max(1.4, width * 0.04);
  ctx.strokeRect(x - width / 2, y - height, width, height * 0.34);

  ctx.fillStyle = GAMEPLAY_COLORS.barrierStripeDark;
  ctx.fillRect(x - width / 2, y - height * 0.72, width, height * 0.17);
  ctx.fillStyle = GAMEPLAY_COLORS.barrierStripeLight;
  ctx.fillRect(x - width / 2, y - height * 0.55, width, height * 0.15);
}

function drawPickup(pickup) {
  const y = depthToY(pickup.depth);
  const x = laneX(pickup.lane, pickup.depth);
  const scale = 0.18 + pickup.depth * 1.05;
  const radius = pickup.radius * scale;

  if (pickup.type === "jerry") {
    const canWidth = radius * 1.35;
    const canHeight = radius * 1.55;

    ctx.fillStyle = GAMEPLAY_COLORS.pickupJerry;
    ctx.fillRect(x - canWidth / 2, y - canHeight, canWidth, canHeight);

    ctx.fillStyle = "#1A1A1A";
    ctx.fillRect(x - canWidth * 0.18, y - canHeight * 0.72, canWidth * 0.36, canHeight * 0.16);

    ctx.strokeStyle = "#1A1A1A";
    ctx.lineWidth = Math.max(2, canWidth * 0.08);
    ctx.strokeRect(x - canWidth / 2, y - canHeight, canWidth, canHeight);
    return;
  }

  ctx.fillStyle = GAMEPLAY_COLORS.pickupDrop;
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.quadraticCurveTo(x + radius, y - radius * 0.2, x, y + radius * 1.15);
  ctx.quadraticCurveTo(x - radius, y - radius * 0.2, x, y - radius);
  ctx.fill();

  ctx.fillStyle = GAMEPLAY_COLORS.pickupDropHighlight;
  ctx.beginPath();
  ctx.arc(x - radius * 0.22, y - radius * 0.2, Math.max(2, radius * 0.2), 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  const depth = 0.98;
  const x = laneX(gameState.playerLane, depth);
  const y = depthToY(depth);

  ctx.fillStyle = "#1A1A1A";
  ctx.beginPath();
  ctx.arc(x, y - 83, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFC907";
  ctx.fillRect(x - 16, y - 72, 32, 38);

  ctx.fillStyle = "#003366";
  ctx.fillRect(x + 4, y - 66, 18, 24);

  ctx.strokeStyle = "#1A1A1A";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 32);
  ctx.lineTo(x - 14, y);
  ctx.moveTo(x + 8, y - 32);
  ctx.lineTo(x + 12, y);
  ctx.stroke();
}

function drawFlash() {
  if (gameState.flashAlpha <= 0) {
    return;
  }

  ctx.fillStyle = `rgba(199, 100, 100, ${gameState.flashAlpha * 0.52})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCelebration() {
  if (!gameState.celebrationActive) {
    return;
  }

  for (const particle of gameState.celebrationParticles) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.globalAlpha = Math.max(0.24, Math.min(1, particle.life / 1.45));

    if (particle.shape === "drop") {
      const size = particle.size;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.75);
      ctx.bezierCurveTo(size * 0.72, -size * 0.2, size * 0.66, size * 0.55, 0, size * 0.84);
      ctx.bezierCurveTo(-size * 0.66, size * 0.55, -size * 0.72, -size * 0.2, 0, -size * 0.75);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.beginPath();
      ctx.arc(-size * 0.18, -size * 0.08, Math.max(1.4, size * 0.14), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size * 0.5, -particle.size * 0.25, particle.size, particle.size * 0.5);
    }

    ctx.restore();
  }
}

function renderFrame() {
  const shakeStrength = gameState.shakeTimer > 0 ? 8 * (gameState.shakeTimer / 0.22) : 0;
  const shakeX = shakeStrength ? (Math.random() * 2 - 1) * shakeStrength : 0;
  const shakeY = shakeStrength ? (Math.random() * 2 - 1) * shakeStrength * 0.7 : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawSkyAndHills();
  drawTrack();

  for (const pickup of gameState.pickups) {
    drawPickup(pickup);
  }

  for (const obstacle of gameState.obstacles) {
    drawObstacle(obstacle);
  }

  drawPlayer();
  drawFlash();
  ctx.restore();

  drawCelebration();
}

function gameLoop(timestamp) {
  if (!gameState.previousTime) {
    gameState.previousTime = timestamp;
  }

  const deltaSeconds = Math.min(0.032, (timestamp - gameState.previousTime) / 1000);
  gameState.previousTime = timestamp;

  if (gameState.running) {
    updateWorld(deltaSeconds);
  }

  updateCelebration(deltaSeconds);

  renderFrame();
  gameState.animationFrameId = requestAnimationFrame(gameLoop);
}

// === Bootstrapping ===
function setupInputs() {
  document.addEventListener("keydown", (event) => {
    const lowerKey = event.key.toLowerCase();

    if (event.key === "ArrowLeft" || lowerKey === "a") {
      event.preventDefault();
      movePlayer(-1);
    }

    if (event.key === "ArrowRight" || lowerKey === "d") {
      event.preventDefault();
      movePlayer(1);
    }

    if (event.code === "Space") {
      event.preventDefault();

      if (startOverlay.classList.contains("visible")) {
        startCampaign();
        return;
      }

      if (levelCompleteOverlay.classList.contains("visible")) {
        continueToNextLevel();
        return;
      }

      if (gameOverOverlay.classList.contains("visible")) {
        handleRestartButton();
      }
    }
  });

  bindTouchLaneControl(leftTouch, -1, "left");
  bindTouchLaneControl(rightTouch, 1, "right");

  bindActionButton(startButton, startCampaign);
  bindActionButton(resetButton, resetCampaign);
  bindActionButton(continueButton, continueToNextLevel);
  bindActionButton(restartButton, handleRestartButton);
}

function setupInitialScreen() {
  buildCampaignRoute();
  loadLevel(0, { resetScore: true, showIntro: false });
  gameState.running = false;

  startOverlay.classList.add("visible");
  levelCompleteOverlay.classList.remove("visible");
  gameOverOverlay.classList.remove("visible");

  setMessage("Press Start Campaign to begin.");
}

function init() {
  setupInputs();
  setupInitialScreen();
  renderFrame();

  if (gameState.animationFrameId) {
    cancelAnimationFrame(gameState.animationFrameId);
  }
  gameState.animationFrameId = requestAnimationFrame(gameLoop);
}

init();