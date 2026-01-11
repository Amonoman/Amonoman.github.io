const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const peer = new Peer();
let conn, isHost = false, isSinglePlayer = false;

// --- ENGINE KONSTANTEN ---
const TICK_RATE = 60;
const DT = 1 / TICK_RATE;
const MS_PER_TICK = 1000 / TICK_RATE;
let accumulator = 0;
let lastTime = performance.now();

let game = {
    p1y: 150, p2y: 150,
    bx: 300, by: 200,
    bv: { x: 400, y: 200 }, // Vektor-Geschwindigkeit (Pixel/Sekunde)
    score1: 0, score2: 0
};

// --- PHYSIK-LOGIK (DETERMINISTISCH) ---
function updatePhysics(dt) {
    if (!isHost) return;

    if (isSinglePlayer) {
        let targetY = game.by - 40;
        game.p2y += (targetY - game.p2y) * 0.12; 
    }

    // Continuous Collision Detection (Sub-stepping)
    const steps = 4; 
    const subDt = dt / steps;

    for (let s = 0; s < steps; s++) {
        game.bx += game.bv.x * subDt;
        game.by += game.bv.y * subDt;

        // Wand-Kollision (Vektor-Reflektion)
        if (game.by <= 0 || game.by >= 395) {
            game.bv.y *= -1;
            game.by = game.by <= 0 ? 1 : 394;
        }

        // Paddle-Kollision (Vektor-basierte Ablenkung)
        handleCollision(15, game.p1y, true);
        handleCollision(575, game.p2y, false);
    }

    if (game.bx < 0) { game.score2++; resetBall(); }
    if (game.bx > 600) { game.score1++; resetBall(); }

    if (conn && conn.open) conn.send(game);
}

function handleCollision(px, py, isLeft) {
    if (game.bx > px && game.bx < px + 10 && game.by > py && game.by < py + 80) {
        // Normalisierte Position auf dem Paddle (-1 bis 1)
        let impact = (game.by - (py + 40)) / 40;
        let angle = impact * (Math.PI / 4); // Max 45 Grad
        
        let speed = Math.sqrt(game.bv.x**2 + game.bv.y**2) * 1.05;
        game.bv.x = (isLeft ? 1 : -1) * speed * Math.cos(angle);
        game.bv.y = speed * Math.sin(angle);
        
        // Anti-Tunneling: Ball aus dem Paddle schieben
        game.bx = isLeft ? px + 11 : px - 1;
    }
}

// --- MAIN LOOP (FIXED TIMESTEP) ---
function gameLoop(now) {
    const frameTime = now - lastTime;
    lastTime = now;
    accumulator += frameTime;

    while (accumulator >= MS_PER_TICK) {
        updatePhysics(DT);
        accumulator -= MS_PER_TICK;
    }

    // Alpha für Rendering-Interpolation (optional für ultra-glatte Bewegung)
    const alpha = accumulator / MS_PER_TICK;
    draw(alpha);
    requestAnimationFrame(gameLoop);
}

function draw(alpha) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 600, 400);
    
    // Render-Interpolation vernachlässigt für minimale Latenz
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 15; ctx.shadowColor = "#4a6cf7";
    ctx.fillRect(15, game.p1y, 10, 80);
    ctx.fillRect(575, game.p2y, 10, 80);
    
    ctx.shadowBlur = 20; ctx.shadowColor = "#fff";
    ctx.beginPath();
    ctx.arc(game.bx, game.by, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

// --- NETZWERK & INPUT ---
function setupConnection() {
    conn.on('open', () => {
        document.getElementById('menu-overlay').style.display = 'none';
        conn.on('data', data => {
            if (isHost) game.p2y = data.p2y; 
            else game = data; // Client übernimmt Host-Zustand
        });
        requestAnimationFrame(gameLoop);
    });
}

const handleMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const mouseY = (clientY - rect.top) * (400 / rect.height) - 40;
    
    if (isHost) game.p1y = mouseY; else game.p2y = mouseY;
    
    if (conn && conn.open) {
        // Client schickt nur seine Position, Host den ganzen State
        conn.send(isHost ? game : { p2y: game.p2y });
    }
};

canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('touchmove', e => { e.preventDefault(); handleMove(e); }, {passive: false});

function resetBall() {
    game.bx = 300; game.by = 200;
    let dir = game.bv.x > 0 ? -1 : 1;
    game.bv = { x: dir * 400, y: (Math.random() - 0.5) * 400 };
}
