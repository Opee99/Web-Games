(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const gameContainer = document.getElementById('game-container');
  const mainMenu = document.getElementById('main-menu');
  const startBtn = document.getElementById('start-btn');
  const rankingsBtn = document.getElementById('rankings-btn');
  const toggleThemeBtn = document.getElementById('toggle-theme-btn');
  const restartBtn = document.getElementById('restart-btn');
  const backBtn = document.getElementById('back-btn');
  const scoreBoard = document.getElementById('score-board');

  // Responsive sizing
  let cellSize = 20; // pixel size of a grid cell (varies by device)
  let rows = 24, cols = 32; // grid size (varies by device)
  const dpr = window.devicePixelRatio || 1;

  // Game state
  let snake, food, score, direction, nextDirection, gameInterval, speed = 100, running = false;

  // --- Utilities ---
  function pickGrid() {
    const w = window.innerWidth;
    // Larger screens get a bigger play area (more cells)
    if (w >= 1200) return { cols: 48, rows: 36 };
    if (w >= 992)  return { cols: 40, rows: 30 };
    if (w >= 768)  return { cols: 32, rows: 24 };
    return { cols: 26, rows: 20 };
  }

  function resizeCanvas(soft = false) {
    const maxW = Math.min(window.innerWidth - 32, 1100);
    const maxH = Math.min(window.innerHeight - 230, 820); // leave space for UI

    const grid = pickGrid();
    cols = grid.cols;
    rows = grid.rows;

    cellSize = Math.max(12, Math.floor(Math.min(maxW / cols, maxH / rows)));

    const cssW = cols * cellSize;
    const cssH = rows * cellSize;

    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    // Draw in CSS pixel units for crispness on high-DPI
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (soft && snake) {
      // Keep current game going; wrap positions into new bounds
      snake.body = snake.body.map(seg => ({
        x: ((seg.x % cols) + cols) % cols,
        y: ((seg.y % rows) + rows) % rows
      }));
      if (!food || food.position.x >= cols || food.position.y >= rows) {
        food = new Food();
      }
      clearCanvas();
      snake.draw();
      food.draw();
    }
  }

  function clearCanvas() {
    // Clear irrespective of current transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  class Snake {
    constructor() {
      this.body = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
      this.growPending = 0;
    }

    draw() {
      ctx.fillStyle = '#00ff7e';
      ctx.shadowColor = '#00ffa3';
      ctx.shadowBlur = 10;
      for (const segment of this.body) {
        ctx.fillRect(segment.x * cellSize, segment.y * cellSize, cellSize, cellSize);
      }
      ctx.shadowBlur = 0;
    }

    update() {
      const head = { ...this.body[0] };
      if (direction === 'LEFT') head.x--;
      else if (direction === 'UP') head.y--;
      else if (direction === 'RIGHT') head.x++;
      else if (direction === 'DOWN') head.y++;

      // Wrap around
      if (head.x < 0) head.x = cols - 1;
      else if (head.x >= cols) head.x = 0;
      if (head.y < 0) head.y = rows - 1;
      else if (head.y >= rows) head.y = 0;

      // Self-collision
      if (this.collides(head)) {
        gameOver();
        return false; // <- important: stop this frame
      }

      this.body.unshift(head);
      if (this.growPending > 0) this.growPending--;
      else this.body.pop();
      return true;
    }

    collides(point) {
      return this.body.some(seg => seg.x === point.x && seg.y === point.y);
    }

    eat() { this.growPending += 1; }
  }

  class Food {
    constructor() { this.position = this.randomPosition(); }

    draw() {
      ctx.fillStyle = '#ff0052';
      ctx.shadowColor = '#ff2a5c';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      const centerX = this.position.x * cellSize + cellSize / 2;
      const centerY = this.position.y * cellSize + cellSize / 2;
      const radius = Math.max(2, cellSize / 2 - 2);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    randomPosition() {
      let pos;
      do {
        pos = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      } while (snake && snake.collides(pos));
      return pos;
    }
  }

  function initGame() {
    resizeCanvas(); // pick grid & size first
    snake = new Snake();
    food  = new Food();
    score = 0;
    direction = 'RIGHT';
    nextDirection = 'RIGHT';
    speed = 100;
    running = true;
    updateScore();
    restartBtn.classList.add('hidden');
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, speed);
  }

  function updateScore() { scoreBoard.textContent = `Score: ${score}`; }

  function gameLoop() {
    if (!running) return;
    clearCanvas();

    const alive = snake.update();
    if (!alive) return; // gameOver handled drawing, button, and interval

    snake.draw();
    food.draw();

    // Eat?
    if (snake.body[0].x === food.position.x && snake.body[0].y === food.position.y) {
      snake.eat();
      score++;
      updateScore();
      food.position = food.randomPosition();
      if (score % 5 === 0 && speed > 40) {
        speed -= 10;
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, speed);
      }
    }

    // Commit new direction at end of frame
    direction = nextDirection;
  }

  function gameOver() {
    running = false;
    clearInterval(gameInterval);
    // Dim background
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);
    // Text
    ctx.fillStyle = '#ff0052';
    ctx.font = 'bold 40px Comic Neue, cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Oops! Game Over 🐍', (cols * cellSize) / 2, (rows * cellSize) / 2 - 30);
    ctx.font = '24px Comic Neue, cursive';
    ctx.fillText(`Your Score: ${score}`, (cols * cellSize) / 2, (rows * cellSize) / 2 + 10);
    restartBtn.classList.remove('hidden');
  }

  // --- Input ---
  window.addEventListener('keydown', e => {
    const key = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
      e.preventDefault(); // prevent page scroll on arrows/space
    }
    if ((key === 'ArrowUp' || key.toLowerCase() === 'w') && direction !== 'DOWN') {
      nextDirection = 'UP';
    } else if ((key === 'ArrowDown' || key.toLowerCase() === 's') && direction !== 'UP') {
      nextDirection = 'DOWN';
    } else if ((key === 'ArrowLeft' || key.toLowerCase() === 'a') && direction !== 'RIGHT') {
      nextDirection = 'LEFT';
    } else if ((key === 'ArrowRight' || key.toLowerCase() === 'd') && direction !== 'LEFT') {
      nextDirection = 'RIGHT';
    }
  }, { passive: false });

  // On-screen buttons
  document.querySelectorAll('.controls .dir').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-dir');
      if (dir === 'UP' && direction !== 'DOWN') nextDirection = 'UP';
      else if (dir === 'DOWN' && direction !== 'UP') nextDirection = 'DOWN';
      else if (dir === 'LEFT' && direction !== 'RIGHT') nextDirection = 'LEFT';
      else if (dir === 'RIGHT' && direction !== 'LEFT') nextDirection = 'RIGHT';
    });
  });

  // Basic swipe support on the canvas
  let touchStartX = 0, touchStartY = 0;
  const SWIPE_THRESHOLD = 24;
  canvas.addEventListener('touchstart', e => {
    if (e.touches[0]) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
    if (!e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      // horizontal
      if (dx > 0 && direction !== 'LEFT') nextDirection = 'RIGHT';
      else if (dx < 0 && direction !== 'RIGHT') nextDirection = 'LEFT';
    } else {
      // vertical
      if (dy > 0 && direction !== 'UP') nextDirection = 'DOWN';
      else if (dy < 0 && direction !== 'DOWN') nextDirection = 'UP';
    }
  }, { passive: true });

  // --- Buttons ---
  restartBtn.addEventListener('click', () => initGame());

  startBtn.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    initGame();
  });

  backBtn.addEventListener('click', () => {
    clearInterval(gameInterval);
    gameContainer.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    running = false;
  });

  toggleThemeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('light');
  });

  rankingsBtn.addEventListener('click', () => {
    alert("🏆 Rankings feature coming soon!");
  });

  // Handle responsive resizes without nuking the game
  window.addEventListener('resize', () => resizeCanvas(true));

  // If user opens directly to the game container in markup, size canvas
  resizeCanvas(true);
})();