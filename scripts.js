const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');
const peer = new Peer();
let conn, isHost = false, isSinglePlayer = false, aiPrecision = 0.1;

let game = { p1y: 150, p2y: 150, bx: 300, by: 200, bvx: 4, bvy: 4 };

peer.on('open', id => document.getElementById('my-id').innerText = id);

// --- MODI STEUERUNG ---

function startSinglePlayer() {
    document.getElementById('difficulty-select').style.display = 'block';
    document.getElementById('join-menu').style.display = 'none';
}

function setDifficulty(level) {
    aiPrecision = level;
    isSinglePlayer = true;
    isHost = true;
    startGame();
}

function initHost() {
    isHost = true;
    isSinglePlayer = false;
    document.getElementById('id-display').style.display = 'block';
    statusText.innerText = "Warte auf Partner...";
    peer.on('connection', c => {
        conn = c;
        setupConnection();
    });
}

function showJoinMenu() {
    document.getElementById('join-menu').style.display = 'block';
    document.getElementById('difficulty-select').style.display = 'none';
}

function connectToPeer() {
    const targetId = document.getElementById('join-id').value;
    if(!targetId) return;
    conn = peer.connect(targetId);
    isHost = false;
    isSinglePlayer = false;
    setupConnection();
}

// --- SPIEL LOGIK ---

function setupConnection() {
    conn.on('open', () => {
        statusText.innerText = "Verbunden!";
        conn.on('data', data => {
            if (isHost) game.p2y = data.p2y; 
            else game = data;
        });
        startGame();
    });
}

function startGame() {
    document.getElementById('setup-menu').style.display = 'none';
    requestAnimationFrame(gameLoop);
}

// Input (Maus & Touch)
const handleMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const mouseY = (clientY - rect.top) * (400 / rect.height) - 40;
    if (isHost) game.p1y = mouseY; else game.p2y = mouseY;
    if (conn && conn.open) conn.send(isHost ? game : { p2y: game.p2y });
};
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('touchmove', e => { e.preventDefault(); handleMove(e); }, {passive: false});

function gameLoop() {
    if (isHost) {
        if (isSinglePlayer) game.p2y += (game.by - 40 - game.p2y) * aiPrecision;
        
        game.bx += game.bvx; game.by += game.bvy;
        if (game.by <= 0 || game.by >= 395) game.bvy *= -1;
        if (game.bx <= 20 && game.by > game.p1y && game.by < game.p1y + 80) game.bvx = Math.abs(game.bvx) * 1.05;
        if (game.bx >= 575 && game.by > game.p2y && game.by < game.p2y + 80) game.bvx = -Math.abs(game.bvx) * 1.05;
        
        if (game.bx < 0 || game.bx > 600) { game.bx = 300; game.bvx = game.bvx > 0 ? -4 : 4; }
        if (conn && conn.open) conn.send(game);
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function draw() {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 600, 400);
    ctx.fillStyle = "#fff";
    ctx.fillRect(10, game.p1y, 10, 80); // Spieler 1
    ctx.fillRect(580, game.p2y, 10, 80); // Spieler 2 / KI
    ctx.beginPath(); ctx.arc(game.bx, game.by, 6, 0, Math.PI*2); ctx.fill();
}
