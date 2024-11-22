const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

let games = {}; // Stores game states
let waitingPlayer = null; // Waiting player socket

// Serve static files (e.g., HTML, JS, CSS)
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    if (waitingPlayer) {
        // Pair with the waiting player
        const gameId = `${waitingPlayer.id}-${socket.id}`;
        games[gameId] = {
            board: Array(5).fill().map(() => Array(5).fill("")),
            currentPlayer: "X",
            players: { X: waitingPlayer.id, O: socket.id }
        };

        // Notify both players
        waitingPlayer.emit('gameStart', { gameId, role: "X" });
        socket.emit('gameStart', { gameId, role: "O" });

        waitingPlayer = null;
    } else {
        // Wait for an opponent
        waitingPlayer = socket;
        socket.emit('waiting', "Waiting for an opponent...");
    }

    // Handle player moves
    socket.on('makeMove', ({ gameId, row, col }) => {
        const game = games[gameId];
        if (!game) return;

        const { board, currentPlayer } = game;

        if (board[row][col] === "") {
            board[row][col] = currentPlayer;

            // Check for a win or tie
            const winner = checkWin(board, row, col, currentPlayer);
            const isTie = board.every(row => row.every(cell => cell !== ""));

            if (winner) {
                io.to(game.players.X).emit('gameOver', { winner });
                io.to(game.players.O).emit('gameOver', { winner });
                delete games[gameId];
            } else if (isTie) {
                io.to(game.players.X).emit('gameOver', { winner: "Tie" });
                io.to(game.players.O).emit('gameOver', { winner: "Tie" });
                delete games[gameId];
            } else {
                // Switch turns
                game.currentPlayer = currentPlayer === "X" ? "O" : "X";
                io.to(game.players.X).emit('updateBoard', { board, currentPlayer: game.currentPlayer });
                io.to(game.players.O).emit('updateBoard', { board, currentPlayer: game.currentPlayer });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        } else {
            // Remove games involving this player
            for (const gameId in games) {
                const game = games[gameId];
                if (game.players.X === socket.id || game.players.O === socket.id) {
                    io.to(game.players.X).emit('opponentDisconnected');
                    io.to(game.players.O).emit('opponentDisconnected');
                    delete games[gameId];
                }
            }
        }
    });
});

// Check for a win
function checkWin(board, row, col, player) {
    return (
        checkDirection(board, row, col, 1, 0, player) || // Horizontal
        checkDirection(board, row, col, 0, 1, player) || // Vertical
        checkDirection(board, row, col, 1, 1, player) || // Diagonal \
        checkDirection(board, row, col, 1, -1, player)   // Diagonal /
    );
}

function checkDirection(board, row, col, rowDir, colDir, player) {
    let count = 1;
    count += countInDirection(board, row, col, rowDir, colDir, player);
    count += countInDirection(board, row, col, -rowDir, -colDir, player);
    return count >= 4;
}

function countInDirection(board, row, col, rowDir, colDir, player) {
    let r = row + rowDir;
    let c = col + colDir;
    let count = 0;

    while (
        r >= 0 && r < board.length &&
        c >= 0 && c < board.length &&
        board[r][c] === player
    ) {
        count++;
        r += rowDir;
        c += colDir;
    }
    return count;
}

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
