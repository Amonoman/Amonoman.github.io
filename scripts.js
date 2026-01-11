const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-board');
const peer = new Peer();

let conn;
let isHost = false;
let isSinglePlayer = false;
let aiPrecision = 0.1;
let game = { p1y: 150, p2y: 150, bx: 300, by: 200, bvx: 400, bvy: 200, s1: 0, s2: 0 };

// --- UI STEUERUNG ---
function showSubMenu(type) {
    document.getElementById('menu-main').classList.add('hidden');
    if (type === 'ki') document.getElementById('menu-ki').classList.remove('hidden');
    if (type === 'join') document.getElementById('menu-join').classList.remove('hidden');
    if (type === 'host') {
        document.getElementById('menu-host').classList.remove('hidden');
        initHosting();
    }
}

function copyMyId() {
    const id = document.getElementById('display-my-id').innerText;
    navigator.clipboard.writeText(id);
    document.getElementById('host-status').innerText = "ID kopiert! Schicke sie einem Freund.";
}

// --- NETZWERK ---
peer.on('open', id => {
    document.getElementById('display-my-id').innerText = id;
});

function initHosting() {
    isHost = true;
    peer.on('connection', c => {
        conn = c;
        setupSocket();
    });
}

function connectToHost() {
    const tid = document.getElementById('join-id-input').value;
    if(!tid) return;
    conn = peer.connect(tid);
    isHost = false;
    setupSocket();
}

function setupSocket() {
    conn.on('open', () => {
        hideOverlay();
        conn.on('data', data => {
            if (isHost) game.p2y = data.p2y;
            else { game = data; updateScoreDisplay(); }
        });
        start();
    });
}

function startGameKI(lvl) {
    aiPrecision = lvl;
    isSinglePlayer = true;
    isHost = true;
    hideOverlay();
    start();
}

function hideOverlay() {
    document.getElementById('overlay').classList.add('hidden');
}

// --- GAME ENGINE ---
let lastTime = performance.now();

function start() {
    requestAnimationFrame(gameLoop);
}

function gameLoop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (isHost) {
        if (isSinglePlayer) {
            game.p2y += (game.by - 40 - game.p2y) * (aiPrecision * 10 * dt * 60);
        }

        game.bx += game.bvx * dt;
        game.by += game.bvy * dt;

        // Kollision oben/unten
        if (game.by <= 0 || game.by >= 395) game.bvy *= -1;

        // Kollision Paddles
        if (game.bx <= 20 && game.by > game.p1y && game.by < game.p1y + 80) game.bvx = Math.abs(game.bvx) * 1.05;
        if (game.bx >= 575 && game.by > game.p2y && game.by < game.p2y + 80) game.bvx = -Math.abs(game.bvx) * 1.05;

        // Tore
        if (game.bx < 0) { game.s2++; resetBall(); updateScoreDisplay(); }
        if (game.bx > 600) { game.s1++; resetBall(); updateScoreDisplay(); }

        if (conn && conn.open) conn.send(game);
    }

    draw();
    requestAnimationFrame(gameLoop);
}

function resetBall() {
    game.bx = 300; game.by = 200;
    game.bvx = (Math.random() > 0.5 ? 400 : -400);
    game.bvy = (Math.random() - 0.5) * 400;
}

function updateScoreDisplay() {
    scoreEl.innerText = `${game.s1} : ${game.s2}`;
}

function draw() {
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,600,400);
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 20; ctx.shadowColor = "#4a6cf7";
    ctx.fillRect(15, game.p1y, 10, 80);
    ctx.fillRect(575, game.p2y, 10, 80);
    ctx.shadowBlur = 15; ctx.shadowColor = "#fff";
    ctx.beginPath(); ctx.arc(game.bx, game.by, 7, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
}

// Steuerung
window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const y = (e.clientY - rect.top) * (400 / rect.height) - 40;
    if (isHost) game.p1y = y; else game.p2y = y;
    if (conn && conn.open) conn.send({ p2y: isHost ? game.p1y : game.p2y });
});
