const CONFIG = {
  canvasWidth: 900,
  canvasHeight: 600,
  ship: {
    radius: 14,
    turnSpeed: Math.PI * 2.4, 
    thrustSpeed: 220,
    respawnInvulnTime: 1500
  },
  bullet: {
    speed: 420,
    life: 1200 // ms
  },
  asteroid: {
    largeRadius: 40,
    mediumRadius: 22,
    largeCount: 4,
    maxSpeed: 80,
    minSpeed: 20
  },
  initialLives: 3
};

// canvas setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.canvasWidth;
canvas.height = CONFIG.canvasHeight;

// HUD elements
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const btnRestart = document.getElementById('btn-restart');

btnRestart.addEventListener('click', () => resetGame());

// game state
const game = {
  score: 0,
  wave: 1,
  paused: false,
  lastTime: null,
  keys: {},
  bullets: [],
  asteroids: [],
  player: null,
  respawnTimer: 0
};

// utilities
function randRange(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(randRange(a, b + 1)); }
function distance(x1,y1,x2,y2){ return Math.hypot(x2-x1, y2-y1); }
function wrapPosition(obj){
  if (obj.x < -40) obj.x = canvas.width + 40;
  if (obj.x > canvas.width + 40) obj.x = -40;
  if (obj.y < -40) obj.y = canvas.height + 40;
  if (obj.y > canvas.height + 40) obj.y = -40;
}

// player setup 
function createPlayer(){
  return {
    x: canvas.width/2,
    y: canvas.height/2,
    angle: -Math.PI/2, // up
    radius: CONFIG.ship.radius,
    turningLeft: false,
    turningRight: false,
    thrusting: false,
    lives: CONFIG.initialLives,
    alive: true,
    invulnerableUntil: 0
  };
}

// asteroid functions
function spawnAsteroid(size='large', x=null, y=null){
  const r = (size === 'large') ? CONFIG.asteroid.largeRadius : CONFIG.asteroid.mediumRadius;
  const spawnX = (x === null) ? (Math.random() < 0.5 ? -r - 10 : canvas.width + r + 10) : x;
  const spawnY = (y === null) ? Math.random() * canvas.height : y;
  const angle = Math.random() * Math.PI * 2;
  const speed = randRange(CONFIG.asteroid.minSpeed, CONFIG.asteroid.maxSpeed);
  return {
    x: spawnX,
    y: spawnY,
    velX: Math.cos(angle) * speed,
    velY: Math.sin(angle) * speed,
    radius: r,
    size: size
  };
}

function spawnInitialAsteroids(count){
  game.asteroids = [];
  for(let i=0;i<count;i++){
    // ensure not spawning too close to player center
    let a = spawnAsteroid('large');
    // if too near center, move to edge
    if (distance(a.x,a.y,canvas.width/2,canvas.height/2) < 140) {
      a.x = (Math.random()<0.5) ? -a.radius - 10 : canvas.width + a.radius + 10;
      a.y = Math.random() * canvas.height;
    }
    game.asteroids.push(a);
  }
}

// bullet config
function fireBullet(){
  if (!game.player.alive) return;
  const angle = game.player.angle;
  const bx = game.player.x + Math.cos(angle) * (game.player.radius + 6);
  const by = game.player.y + Math.sin(angle) * (game.player.radius + 6);
  const velX = Math.cos(angle) * CONFIG.bullet.speed;
  const velY = Math.sin(angle) * CONFIG.bullet.speed;
  game.bullets.push({x:bx,y:by,velX,velY,life:CONFIG.bullet.life});
}

// input handling 
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const key = e.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') game.keys.left = true;
  if (key === 'arrowright' || key === 'd') game.keys.right = true;
  if (key === 'arrowup' || key === 'w') game.keys.up = true;
  if (key === ' ' || key === 'k') {
    game.keys.fire = true;
    fireBullet();
  }
  if (key === 'p' || key === 'escape') togglePause();
  if (key === 'r') resetGame();
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') game.keys.left = false;
  if (key === 'arrowright' || key === 'd') game.keys.right = false;
  if (key === 'arrowup' || key === 'w') game.keys.up = false;
  if (key === ' ' || key === 'k') game.keys.fire = false;
});

// collisions
function checkCollisions(){
  // bullets vs asteroids
  for (let b = game.bullets.length - 1; b >= 0; b--) {
    const bullet = game.bullets[b];
    for (let a = game.asteroids.length - 1; a >= 0; a--) {
      const ast = game.asteroids[a];
      if (distance(bullet.x, bullet.y, ast.x, ast.y) < ast.radius) {
        // hit
        handleAsteroidHit(a);
        game.bullets.splice(b,1);
        break;
      }
    }
  }

  // player vs asteroids
  if (game.player.alive && Date.now() > game.player.invulnerableUntil) {
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
      const ast = game.asteroids[i];
      if (distance(game.player.x, game.player.y, ast.x, ast.y) < (game.player.radius + ast.radius - 6)) {
        // player hit
        handlePlayerHit();
        break;
      }
    }
  }
}

function handleAsteroidHit(index){
  const ast = game.asteroids[index];
  if (ast.size === 'large') {
    // split into two medium asteroids at same position with random velocities
    for (let i=0;i<2;i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = randRange(30, CONFIG.asteroid.maxSpeed);
      game.asteroids.push({
        x: ast.x,
        y: ast.y,
        velX: Math.cos(angle)*speed,
        velY: Math.sin(angle)*speed,
        radius: CONFIG.asteroid.mediumRadius,
        size: 'medium'
      });
    }
    game.score += 20;
  } else {
    // medium: destroy
    game.score += 50;
  }
  // remove the hit asteroid
  game.asteroids.splice(index,1);
}

function handlePlayerHit(){
  game.player.lives -= 1;
  game.player.alive = false;
  if (game.player.lives <= 0) {
    // game over
    showOverlay('Game Over', `Final score: ${game.score}. Press Restart or R to try again.`);
  } else {
    // respawn after a short delay
    setTimeout(respawnPlayer, 700);
  }
}

// respawn function
function respawnPlayer(){
  game.player.x = canvas.width/2;
  game.player.y = canvas.height/2;
  game.player.angle = -Math.PI/2;
  game.player.alive = true;
  game.player.invulnerableUntil = Date.now() + CONFIG.ship.respawnInvulnTime;
}

// game loop updates
function update(dt){
  if (game.paused) return;

  // player rotation
  if (game.keys.left) game.player.angle -= CONFIG.ship.turnSpeed * dt;
  if (game.keys.right) game.player.angle += CONFIG.ship.turnSpeed * dt;

  // player movement (simplified: fixed speed while thrusting)
  if (game.keys.up) {
    game.player.x += Math.cos(game.player.angle) * CONFIG.ship.thrustSpeed * dt;
    game.player.y += Math.sin(game.player.angle) * CONFIG.ship.thrustSpeed * dt;
  }

  // wrap player
  wrapPosition(game.player);

  // bullets update
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.x += b.velX * dt;
    b.y += b.velY * dt;
    b.life -= dt * 1000;
    wrapPosition(b);
    if (b.life <= 0) game.bullets.splice(i,1);
  }

  // asteroids update
  for (let i = game.asteroids.length - 1; i >= 0; i--) {
    const a = game.asteroids[i];
    a.x += a.velX * dt;
    a.y += a.velY * dt;
    wrapPosition(a);
  }

  // collisions
  checkCollisions();

  // wave progression
  if (game.asteroids.length === 0) {
    game.wave += 1;
    spawnInitialAsteroids(CONFIG.asteroid.largeCount + game.wave - 1);
    
    // Award credits for passing wave
    if (typeof earnCredits === 'function') {
        earnCredits(100); 
        // Show a small notification on the overlay or console
        console.log("Wave passed! Earned 100 credits.");
    }
  }

  // update HUD
  scoreEl.textContent = `Score: ${game.score}`;
  livesEl.textContent = `Lives: ${game.player.lives}`;
  waveEl.textContent = `Wave: ${game.wave}`;
}

// drawing 
function draw(){
  // clear
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // draw player
  if (game.player.alive) drawShip(game.player);
  else {
    // draw blurred ghost or nothing
  }

  // draw bullets
  for (const b of game.bullets) drawBullet(b);

  // draw asteroids
  for (const a of game.asteroids) drawAsteroid(a);

  // if player invulnerable: draw halo
  if (Date.now() < game.player.invulnerableUntil) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, game.player.radius + 10, 0, Math.PI*2);
    ctx.strokeStyle = '#7ef';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawShip(ship){
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  // ship triangle
  ctx.beginPath();
  ctx.moveTo(ship.radius, 0);
  ctx.lineTo(-ship.radius*0.8, ship.radius*0.8);
  ctx.lineTo(-ship.radius*0.8, -ship.radius*0.8);
  ctx.closePath();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // thrust flame when up key
  if (game.keys.up) {
    ctx.beginPath();
    ctx.moveTo(-ship.radius*0.6, 0);
    ctx.lineTo(-ship.radius - 8, 6);
    ctx.lineTo(-ship.radius - 8, -6);
    ctx.closePath();
    ctx.fillStyle = '#ffa500';
    ctx.fill();
  }
  ctx.restore();
}

function drawBullet(b){
  ctx.save();
  ctx.beginPath();
  ctx.arc(b.x,b.y,2,0,Math.PI*2);
  ctx.fillStyle = '#7ef';
  ctx.fill();
  ctx.restore();
}

function drawAsteroid(a){
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.beginPath();
  const r = a.radius;
  const jag = Math.max(6, Math.floor(r/4));
  for (let i=0;i<jag;i++){
    const theta = (i/jag) * Math.PI * 2;
    const rad = r - (Math.random()*r*0.22);
    const x = Math.cos(theta) * rad;
    const y = Math.sin(theta) * rad;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// pause overlay
function showOverlay(title, msg){
  overlayTitle.textContent = title;
  overlayMsg.textContent = msg;
  overlay.classList.remove('hidden');
  game.paused = true;
}

function hideOverlay(){
  overlay.classList.add('hidden');
  game.paused = false;
}

function togglePause(){
  if (game.paused) {
    hideOverlay();
  } else {
    showOverlay('Paused','Press P to resume');
  }
}

// reset game
function resetGame(){
  game.score = 0;
  game.wave = 1;
  game.bullets = [];
  game.asteroids = [];
  game.player = createPlayer();
  hideOverlay();
  spawnInitialAsteroids(CONFIG.asteroid.largeCount);
  game.lastTime = performance.now();
}

// main loop 
function loop(now){
  if (!game.lastTime) game.lastTime = now;
  const dt = Math.min(0.05, (now - game.lastTime) / 1000); // clamp large dt
  game.lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

// initialization
function init(){
  game.player = createPlayer();
  spawnInitialAsteroids(CONFIG.asteroid.largeCount);
  game.lastTime = performance.now();
  requestAnimationFrame(loop);
}

init();
