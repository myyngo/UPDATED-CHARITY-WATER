// ── CONFIG ──
const MODES = {
  easy:   { goal: 15, speed: 1600, time: 40, obstacles: false },
  normal: { goal: 25, speed: 1000, time: 30, obstacles: true  },
  hard:   { goal: 40, speed: 550,  time: 25, obstacles: true  }
};

// ════════════════════════════════════════════════
// 🔊 SOUND SYSTEM
const SOUNDS = {
  collect:   new Audio('sounds/collect.mp3'),
  obstacle:  new Audio('sounds/obstacle.mp3'),
  win:       new Audio('sounds/win.mp3'),
  lose:      new Audio('sounds/lose.mp3'),
  start:     new Audio('sounds/start.mp3'),
  milestone: new Audio('sounds/milestone.mp3'),
};
SOUNDS.collect.volume   = 0.7;
SOUNDS.obstacle.volume  = 0.8;
SOUNDS.win.volume       = 0.9;
SOUNDS.lose.volume      = 0.6;
SOUNDS.start.volume     = 0.5;
SOUNDS.milestone.volume = 0.7;
function playSound(name) {
  const audio = SOUNDS[name];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// 🏆 MILESTONE MESSAGES ARRAY
const MILESTONES = [
  { at: 1,     msg: "💧 First can collected! Keep tapping!",         type: "normal"      },
  { pct: 0.25, msg: "⚡ 25% there — you're off to a great start!",    type: "normal"      },
  { pct: 0.50, msg: "🌊 Halfway there! A family now has clean water!", type: "celebration" },
  { pct: 0.75, msg: "🔥 75%! Almost enough for a whole village!",     type: "celebration" },
  { pct: 0.90, msg: "🚀 SO CLOSE! Just a few more cans!",             type: "warning"     },
  { at: 5,     msg: "🏡 5 people now have access to clean water!",    type: "normal"      },
  { at: 10,    msg: "🌍 10 cans! A whole family is saved!",           type: "celebration" },
  { at: 20,    msg: "🏘️ 20 cans! An entire village is thriving!",    type: "celebration" },
  { at: 30,    msg: "🚰 30 cans! You're a certified water hero!",     type: "celebration" },
];

// ── STATE ──
let currentMode = 'easy';
let currentCans = 0;
let gameActive  = false;
let spawnInterval, timerInterval;
let timeLeft = 40;
let goalCans = 15;
let shownMilestones = new Set();

// ── DOM REFS ──
const grid        = document.getElementById('game-grid');
const cansEl      = document.getElementById('cans-count');
const goalEl      = document.getElementById('goal-count');
const timerEl     = document.getElementById('timer-display');
const progressBar = document.getElementById('progress-bar');
const progressPct = document.getElementById('progress-pct');
const milestoneEl = document.getElementById('milestone-msg');
const startBtn    = document.getElementById('start-btn');
const resetBtn    = document.getElementById('reset-btn');
const overlay     = document.getElementById('overlay');
const diffSection = document.getElementById('difficulty-section');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx         = confettiCanvas.getContext('2d');

// ── DIFFICULTY BUTTONS ──
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (gameActive) return;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    currentMode = btn.dataset.mode;
    const cfg = MODES[currentMode];
    goalEl.textContent = cfg.goal;
    timerEl.textContent = cfg.time + 's';
  });
});

// ── BUILD GRID ──
function createGrid() {
  grid.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    grid.appendChild(cell);
  }
}
createGrid();

// ── SPAWN ──
function spawnItem() {
  if (!gameActive) return;
  const cells = Array.from(document.querySelectorAll('.grid-cell'));
  const cfg   = MODES[currentMode];
  cells.forEach(c => c.innerHTML = '');

  const canIdx = Math.floor(Math.random() * cells.length);
  spawnCan(cells[canIdx]);

  if (cfg.obstacles && Math.random() < 0.4) {
    let obsIdx;
    do { obsIdx = Math.floor(Math.random() * cells.length); }
    while (obsIdx === canIdx);
    spawnObstacle(cells[obsIdx]);
  }
}

function spawnCan(cell) {
  const wrapper = document.createElement('div');
  wrapper.className = 'water-can-wrapper';
  wrapper.innerHTML = `
    <div class="jerry-can">
      <div class="can-cap"></div>
      <div class="can-neck"></div>
      <div class="can-body"><div class="can-stripe"></div></div>
      <div class="can-handle"></div>
    </div>`;
  wrapper.addEventListener('click', () => collectCan(cell, wrapper));
  cell.appendChild(wrapper);
}

function spawnObstacle(cell) {
  const wrapper = document.createElement('div');
  wrapper.className = 'obstacle-wrapper';
  wrapper.innerHTML = `<div class="mud">TNT</div>`;
  wrapper.addEventListener('click', () => hitObstacle(cell, wrapper));
  cell.appendChild(wrapper);
}

// ── COLLECT CAN ──
function collectCan(cell, wrapper) {
  if (!gameActive) return;
  wrapper.classList.add('clicked');

  playSound('collect');

  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = '+1 💧';
  cell.appendChild(popup);
  setTimeout(() => popup.remove(), 650);

  setTimeout(() => { if (cell.contains(wrapper)) cell.innerHTML = ''; }, 280);

  currentCans++;
  updateScore();
  checkMilestone();
  if (currentCans >= goalCans) endGame(true);
}

// ── HIT OBSTACLE ──
function hitObstacle(cell, wrapper) {
  if (!gameActive) return;

  playSound('obstacle');

  cell.classList.add('shaking');
  setTimeout(() => cell.classList.remove('shaking'), 400);

  document.body.classList.add('penalty-flash');
  setTimeout(() => document.body.classList.remove('penalty-flash'), 400);

  const penalty = 2;
  const popup = document.createElement('div');
  popup.className = 'score-popup penalty';
  popup.textContent = `-${penalty} TNT`;
  cell.appendChild(popup);
  setTimeout(() => popup.remove(), 700);

  setTimeout(() => { if (cell.contains(wrapper)) cell.innerHTML = ''; }, 320);

  currentCans = Math.max(0, currentCans - penalty);
  updateScore();
  showMilestone(`TNT Obstacle! -${penalty} cans!`);
}

// ── UPDATE SCORE ──
function updateScore() {
  cansEl.textContent = currentCans;
  const pct = Math.min(100, Math.round((currentCans / goalCans) * 100));
  progressBar.style.width = pct + '%';
  progressPct.textContent = pct + '%';
}

// ── MILESTONES ──
function checkMilestone() {
  for (const m of MILESTONES) {
    const threshold = m.at !== undefined ? m.at : Math.round(m.pct * goalCans);
    const key = m.at !== undefined ? `at-${m.at}` : `pct-${m.pct}`;
    if (currentCans >= threshold && !shownMilestones.has(key)) {
      shownMilestones.add(key);
      showMilestone(m.msg, m.type);
      playSound('milestone');
    }
  }
}

function showMilestone(msg, type = 'normal') {
  milestoneEl.textContent = msg;
  milestoneEl.className = '';
  milestoneEl.classList.add('show', `milestone-${type}`);
  clearTimeout(milestoneEl._timeout);
  milestoneEl._timeout = setTimeout(() => {
    milestoneEl.classList.remove('show');
  }, 3000);
}

// ── TIMER ──
function startTimer() {
  const cfg = MODES[currentMode];
  timeLeft = cfg.time;
  timerEl.textContent = timeLeft + 's';
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft + 's';
    if (timeLeft <= 5) timerEl.style.color = '#e74c3c';
    if (timeLeft <= 0) endGame(false);
  }, 1000);
}

// ── RESET ──
function resetGame() {
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  stopConfetti();

  currentCans = 0;
  shownMilestones = new Set();

  createGrid();
  cansEl.textContent = '0';
  progressBar.style.width = '0%';
  progressPct.textContent = '0%';
  timerEl.style.color = '';
  timerEl.textContent = MODES[currentMode].time + 's';
  milestoneEl.classList.remove('show');
  overlay.classList.remove('show');

  startBtn.disabled = false;
  resetBtn.style.display = 'none';
  diffSection.style.opacity = '';
  diffSection.style.pointerEvents = '';
}

// ── START ──
function startGame() {
  currentCans = 0;
  shownMilestones = new Set();
  gameActive = true;
  const cfg = MODES[currentMode];
  goalCans = cfg.goal;

  goalEl.textContent = goalCans;
  timerEl.style.color = '';
  updateScore();
  createGrid();

  startBtn.disabled = true;
  resetBtn.style.display = 'block';
  diffSection.style.opacity = '0.3';
  diffSection.style.pointerEvents = 'none';

  playSound('start');

  spawnItem();
  spawnInterval = setInterval(spawnItem, cfg.speed);
  startTimer();
}

// ── END ──
function endGame(won) {
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  createGrid();

  const emoji   = document.getElementById('overlay-emoji');
  const title   = document.getElementById('overlay-title');
  const msg     = document.getElementById('overlay-msg');
  const scoreEl = document.getElementById('overlay-score');

  if (won) {
    emoji.textContent = '🏆';
    title.textContent = 'You Did It!';
    msg.textContent   = 'You collected enough cans to bring clean water to a community. Amazing!';
    playSound('win');
    launchConfetti();
  } else {
    emoji.textContent = currentCans >= Math.floor(goalCans * 0.6) ? '💪' : '💧';
    title.textContent = currentCans >= Math.floor(goalCans * 0.6) ? 'So Close!' : "Time's Up!";
    msg.textContent   = currentCans >= Math.floor(goalCans * 0.6)
      ? 'You were almost there! Give it one more try.'
      : 'Every drop matters. Keep going — the world needs water heroes!';
    playSound('lose');
  }

  scoreEl.textContent = `You collected ${currentCans} of ${goalCans} cans.`;
  overlay.classList.add('show');
}

// ── PLAY AGAIN ──
document.getElementById('play-again-btn').addEventListener('click', resetGame);
resetBtn.addEventListener('click', resetGame);
startBtn.addEventListener('click', startGame);

// 🎉 CONFETTI ENGINE
let confettiParticles = [];
let confettiAnimId = null;
const CONFETTI_COLORS = ['#FFC907','#FFE066','#ffffff','#27ae60','#3498db','#e74c3c','#f39c12'];
function launchConfetti() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCanvas.style.display = 'block';
  confettiParticles = [];
  for (let i = 0; i < 160; i++) {
    confettiParticles.push({
      x:      Math.random() * confettiCanvas.width,
      y:      Math.random() * confettiCanvas.height - confettiCanvas.height,
      w:      Math.random() * 12 + 5,
      h:      Math.random() * 7 + 4,
      color:  CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rot:    Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 0.15,
      speedX: (Math.random() - 0.5) * 3,
      speedY: Math.random() * 3 + 2,
      opacity: 1
    });
  }
  animateConfetti();
  setTimeout(stopConfetti, 4000);
}
function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
    p.x     += p.speedX;
    p.y     += p.speedY;
    p.rot   += p.rotSpd;
    p.speedY += 0.05;
    if (p.y > confettiCanvas.height * 0.75) {
      p.opacity -= 0.025;
    }
  });
  confettiParticles = confettiParticles.filter(p => p.opacity > 0);
  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    stopConfetti();
  }
}
function stopConfetti() {
  if (confettiAnimId) { cancelAnimationFrame(confettiAnimId); confettiAnimId = null; }
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiCanvas.style.display = 'none';
  confettiParticles = [];
}
window.addEventListener('resize', () => {});
