const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');
const peer = new Peer();
let conn, isHost = false, isSinglePlayer = false;
let aiPrecision = 0.1; // Schwierigkeit

let game = {
    p1y: 150, p2y: 150,
    bx: 300, by: 200,
    bvx: 4, bvy: 4
};

// Modus-Steuerung
function showMultiplayerMenu() {
    document.getElementById('setup-menu').style.display = 'none';
    document.getElementById('multiplayer-ui').style.display = 'block';
    statusText.innerText = "P2P Modus aktiv.";
}

function startSinglePlayer() {
    document.getElementById('difficulty-select').style.display = 'block';
}

function setDifficulty(level) {
    aiPrecision = level;
    isSinglePlayer = true;
    isHost = true; // Im KI Modus ist man immer "Host" der Physik
    document.getElementById('setup-menu').style.display = 'none';
    statusText.innerText = "KI Modus aktiv.";
    requestAnimationFrame(gameLoop);
}

// PeerJS Setup
peer.on('open', id => document.getElementById('my-id').innerText = id);
peer.on('connection', c => {
    conn = c; isHost = true; isSinglePlayer = false;
    document.getElementById('setup-menu').style.display = 'none';
    setupConnection();
});

function connectToPeer() {
    conn = peer.connect(document.getElementById('join-id').value);
    isHost = false; isSinglePlayer = false;
    setupConnection();
}

function setupConnection() {
    statusText.innerText = "Verbunden!";
    conn.on('data', data => { if (isHost) game.p2y = data.p2y; else game = data; });
    requestAnimationFrame(gameLoop);
}

// Input Handling (Maus & Touch)
function handleMove(e) {
    const rect = canvas.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const mouseY = (clientY - rect.top) * (canvas.height / rect.height) - 40;
    if (isHost) game.p1y = mouseY; else game.p2y = mouseY;
    if (conn && conn.open) conn.send(isHost ? game : { p2y: game.p2y });
}
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('touchmove', e => { e.preventDefault(); handleMove(e); }, {passive: false});

function gameLoop() {
    if (isHost) {
        // KI Logik
        if (isSinglePlayer) {
            let targetY = game.by - 40;
            game.p2y += (targetY - game.p2y) * aiPrecision;
        }

        // Physik
        game.bx += game.bvx; game.by += game.bvy;
        if (game.by <= 0 || game.by >= 395) game.bvy *= -1;
        
        // Kollision Paddles
        if (game.bx <= 20 && game.by > game.p1y && game.by < game.p1y + 80) game.bvx = Math.abs(game.bvx) * 1.05;
        if (game.bx >= 575 && game.by > game.p2y && game.by < game.p2y + 80) game.bvx = -Math.abs(game.bvx) * 1.05;
        
        // Reset Ball
        if (game.bx < 0 || game.bx > 600) { game.bx = 300; game.bvx = game.bvx > 0 ? -4 : 4; }
        if (conn && conn.open) conn.send(game);
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function draw() {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 600, 400);
    ctx.fillStyle = "#fff";
    ctx.fillRect(10, game.p1y, 10, 80);
    ctx.fillRect(580, game.p2y, 10, 80);
    ctx.beginPath(); ctx.arc(game.bx, game.by, 6, 0, Math.PI*2); ctx
      .fill();
}
