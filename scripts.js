const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const peer = new Peer();

let conn, isHost = false, isSinglePlayer = false, aiPrecision = 0.1;
let game = { p1y: 150, p2y: 150, bx: 300, by: 200, bvx: 400, bvy: 200, s1: 0, s2: 0 };

// --- UI LOGIK ---
function uiAction(type) {
    document.getElementById('main-menu').classList.add('hidden');
    if(type === 'show-ki') document.getElementById('ki-menu').classList.remove('hidden');
    if(type === 'show-host') {
        document.getElementById('host-menu').classList.remove('hidden');
        initHost();
    }
    if(type === 'show-join') document.getElementById('join-menu').classList.remove('hidden');
}

function copyId() {
    navigator.clipboard.writeText(document.getElementById('my-id-display').innerText);
    alert("ID kopiert!");
}

// --- NETZWERK ---
peer.on('open', id => document.getElementById('my-id-display').innerText = id);

function initHost() {
    isHost = true;
    peer.on('connection', c => {
        conn = c;
        setupSocket();
    });
}

function connectToPeer() {
    const tid = document.getElementById('target-id').value;
    conn = peer.connect(tid);
    isHost = false;
    setupSocket();
}

function setupSocket() {
    conn.on('open', () => {
        document.getElementById('overlay').classList.add('hidden');
        conn.on('data', data => {
            if (isHost) game.p2y = data.p2y; 
            else { game = data; updateScore(); }
        });
        startLoop();
    });
}

function setDifficulty(lvl) {
    aiPrecision = lvl; isSinglePlayer = true; isHost = true;
    document.getElementById('overlay').classList.add('hidden');
    startLoop();
}

// --- GAME ENGINE ---
let lastTime = performance.now();
function startLoop() { requestAnimationFrame(gameLoop); }

function gameLoop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (isHost) {
        if (isSinglePlayer) game.p2y += (game.by - 40 - game.p2y) * (aiPrecision * 10 * dt * 60);
        
        game.bx += game.bvx * dt;
        game.by += game.bvy * dt;

        if (game.by <= 0 || game.by >= 395) game.bvy *= -1;
        if (game.bx <= 20 && game.by > game.p1y && game.by < game.p1y + 80) game.bvx = Math.abs(game.bvx) * 1.05;
        if (game.bx >= 575 && game.by > game.p2y && game.by < game.p2y + 80) game.bvx = -Math.abs(game.bvx) * 1.05;

        if (game.bx < 0) { game.s2++; resetBall(); updateScore(); }
        if (game.bx > 600) { game.s1++; resetBall(); updateScore(); }
        
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

function updateScore() {
    scoreEl.innerText = `${game.s1} : ${game.s2}`;
}

function draw() {
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,600,400);
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 20; ctx.shadowColor = "#00f2ff";
    ctx.fillRect(15, game.p1y, 10, 80);
    ctx.fillRect(575, game.p2y, 10, 80);
    ctx.shadowColor = "#fff";
    ctx.beginPath(); ctx.arc(game.bx, game.by, 7, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
}

// Controls
window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const y = (e.clientY - rect.top) * (400 / rect.height) - 40;
    if (isHost) game.p1y = y; else game.p2y = y;
    if (conn && conn.open) conn.send({ p2y: isHost ? game.p1y : game.p2y });
});
