const socket = io();
let gameId;
let role;
let currentPlayer;

socket.on('waiting', (message) => {
    document.getElementById('status').textContent = message;
});

socket.on('gameStart', (data) => {
    gameId = data.gameId;
    role = data.role;
    currentPlayer = "X";
    document.getElementById('status').textContent = `Game started! You are ${role}`;
});

socket.on('updateBoard', (data) => {
    const { board, currentPlayer: nextPlayer } = data;
    updateBoardUI(board);
    currentPlayer = nextPlayer;
    document.getElementById('status').textContent = currentPlayer === role ? "Your turn!" : "Opponent's turn";
});

socket.on('gameOver', (data) => {
    const { winner } = data;
    document.getElementById('status').textContent = winner === role ? "You win!" : winner === "Tie" ? "It's a tie!" : "You lose!";
});

socket.on('opponentDisconnected', () => {
    document.getElementById('status').textContent = "Opponent disconnected. Game over.";
});

function handleCellClick(e) {
    if (currentPlayer === role && !gameOver) {
        const index = e.target.dataset.index;
        const row = Math.floor(index / SIZE);
        const col = index % SIZE;
        socket.emit('makeMove', { gameId, row, col });
    }
}
