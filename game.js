(() => {
  'use strict';

  // ---------- DOM ----------
  const titleScreen = document.getElementById('title-screen');
  const gameScreen = document.getElementById('game-screen');
  const gameoverScreen = document.getElementById('gameover-screen');

  const startBtn = document.getElementById('start-btn');
  const retryBtn = document.getElementById('retry-btn');
  const titleBtn = document.getElementById('title-btn');

  const titleBestScoreEl = document.getElementById('title-best-score');
  const gameoverBestScoreEl = document.getElementById('gameover-best-score');
  const finalScoreEl = document.getElementById('final-score');
  const newRecordEl = document.getElementById('new-record');

  const livesEl = document.getElementById('lives');
  const scoreEl = document.getElementById('score');

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // ---------- Constants ----------
  const BEST_SCORE_KEY = 'dodgePoopBestScore';
  const START_LIVES = 3;
  const INVINCIBLE_DURATION = 1000; // ms after hit
  const PLAYER_SIZE = 40;
  const PLAYER_SPEED = 380; // px/sec
  const POOP_SIZE = 32;
  const POOP_BASE_SPEED = 160; // px/sec
  const POOP_BASE_INTERVAL = 1200; // ms

  // ---------- State ----------
  let width, height;
  let player, poops, keys;
  let score, lives, elapsed, invincibleUntil;
  let spawnTimer, running;
  let lastTime;
  let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;

  function resizeCanvas() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resizeCanvas);

  // ---------- Difficulty curve ----------
  function getDifficulty(elapsedSec) {
    let speedMult, interval;
    if (elapsedSec < 15) {
      speedMult = 1.0;
      interval = 1.2;
    } else if (elapsedSec < 30) {
      speedMult = 1.3;
      interval = 0.9;
    } else if (elapsedSec < 60) {
      speedMult = 1.6;
      interval = 0.6;
    } else {
      const steps = Math.floor((elapsedSec - 60) / 30) + 1;
      speedMult = 1.6 + steps * 0.2;
      interval = Math.max(0.2, 0.6 - steps * 0.1);
    }
    return { speedMult, interval };
  }

  // ---------- Screens ----------
  function showScreen(screen) {
    [titleScreen, gameScreen, gameoverScreen].forEach((s) => s.classList.add('hidden'));
    screen.classList.remove('hidden');
  }

  function updateBestScoreDisplays() {
    titleBestScoreEl.textContent = bestScore;
    gameoverBestScoreEl.textContent = bestScore;
  }

  // ---------- Input ----------
  keys = { left: false, right: false };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });

  function handlePointer(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    player.targetX = Math.max(0, Math.min(width - PLAYER_SIZE, x - PLAYER_SIZE / 2));
  }

  canvas.addEventListener('mousedown', (e) => {
    if (!player) return;
    player.dragging = true;
    handlePointer(e.clientX);
  });
  window.addEventListener('mousemove', (e) => {
    if (player && player.dragging) handlePointer(e.clientX);
  });
  window.addEventListener('mouseup', () => {
    if (player) player.dragging = false;
  });

  canvas.addEventListener('touchstart', (e) => {
    if (!player) return;
    player.dragging = true;
    handlePointer(e.touches[0].clientX);
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (player && player.dragging) handlePointer(e.touches[0].clientX);
  }, { passive: true });
  canvas.addEventListener('touchend', () => {
    if (player) player.dragging = false;
  });

  // ---------- Game setup ----------
  function initGame() {
    resizeCanvas();
    player = {
      x: width / 2 - PLAYER_SIZE / 2,
      y: height - PLAYER_SIZE - 20,
      targetX: null,
      dragging: false,
    };
    poops = [];
    keys.left = false;
    keys.right = false;
    score = 0;
    lives = START_LIVES;
    elapsed = 0;
    invincibleUntil = 0;
    spawnTimer = 0;
    running = true;
    lastTime = null;
    renderLives();
    scoreEl.textContent = '0';
  }

  function renderLives() {
    livesEl.innerHTML = '';
    for (let i = 0; i < lives; i++) {
      const span = document.createElement('span');
      span.textContent = '❤️';
      livesEl.appendChild(span);
    }
  }

  function spawnPoop(speedMult) {
    const isGolden = Math.random() < 0.08;
    poops.push({
      x: Math.random() * (width - POOP_SIZE),
      y: -POOP_SIZE,
      speed: POOP_BASE_SPEED * speedMult * (isGolden ? 1.1 : 1),
      golden: isGolden,
    });
  }

  // ---------- Update ----------
  function update(dt) {
    elapsed += dt;
    const elapsedSec = elapsed / 1000;
    const { speedMult, interval } = getDifficulty(elapsedSec);

    // player movement
    if (keys.left) player.x -= PLAYER_SPEED * (dt / 1000);
    if (keys.right) player.x += PLAYER_SPEED * (dt / 1000);
    if (player.targetX !== null) {
      const dx = player.targetX - player.x;
      player.x += dx * Math.min(1, (dt / 1000) * 14);
    }
    player.x = Math.max(0, Math.min(width - PLAYER_SIZE, player.x));

    // spawn
    spawnTimer += dt;
    if (spawnTimer >= interval * 1000) {
      spawnTimer = 0;
      spawnPoop(speedMult);
    }

    // move poops + collision + scoring
    const now = performance.now();
    const invincible = now < invincibleUntil;

    for (let i = poops.length - 1; i >= 0; i--) {
      const p = poops[i];
      p.y += p.speed * (dt / 1000);

      const hit =
        p.x < player.x + PLAYER_SIZE &&
        p.x + POOP_SIZE > player.x &&
        p.y < player.y + PLAYER_SIZE &&
        p.y + POOP_SIZE > player.y;

      if (hit && !invincible) {
        if (p.golden) {
          score += 50;
        } else {
          lives -= 1;
          renderLives();
          invincibleUntil = now + INVINCIBLE_DURATION;
          if (lives <= 0) {
            poops.splice(i, 1);
            endGame();
            return;
          }
        }
        poops.splice(i, 1);
        continue;
      }

      if (p.y > height) {
        score += 1;
        poops.splice(i, 1);
      }
    }

    // survival score
    score += Math.round(10 * (dt / 1000));
    scoreEl.textContent = score;
  }

  // ---------- Render ----------
  function render() {
    ctx.clearRect(0, 0, width, height);

    // background gradient sky
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(1, '#b8e0f7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // player
    const now = performance.now();
    const invincible = now < invincibleUntil;
    ctx.save();
    ctx.globalAlpha = invincible && Math.floor(now / 100) % 2 === 0 ? 0.4 : 1;
    ctx.font = `${PLAYER_SIZE}px serif`;
    ctx.textBaseline = 'top';
    ctx.fillText('🙂', player.x, player.y);
    ctx.restore();

    // poops
    ctx.font = `${POOP_SIZE}px serif`;
    ctx.textBaseline = 'top';
    for (const p of poops) {
      ctx.fillText(p.golden ? '✨' : '💩', p.x, p.y);
    }
  }

  // ---------- Loop ----------
  function loop(timestamp) {
    if (!running) return;
    if (lastTime === null) lastTime = timestamp;
    const dt = Math.min(50, timestamp - lastTime);
    lastTime = timestamp;

    update(dt);
    if (!running) return;
    render();
    requestAnimationFrame(loop);
  }

  // ---------- Game flow ----------
  function startGame() {
    showScreen(gameScreen);
    initGame();
    requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    const isNewRecord = score > bestScore;
    if (isNewRecord) {
      bestScore = score;
      localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    }
    finalScoreEl.textContent = score;
    newRecordEl.classList.toggle('hidden', !isNewRecord);
    updateBestScoreDisplays();
    showScreen(gameoverScreen);
  }

  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', startGame);
  titleBtn.addEventListener('click', () => {
    updateBestScoreDisplays();
    showScreen(titleScreen);
  });

  // ---------- Init ----------
  updateBestScoreDisplays();
  showScreen(titleScreen);
})();
