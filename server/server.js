const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Game rooms storage
const gameRooms = new Map();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Number Guessing Game Server is running',
    rooms: gameRooms.size 
  });
});

// API to check if room exists
app.get('/api/room/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const exists = gameRooms.has(roomId);
  res.json({ exists, roomId });
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create a new game room
  socket.on('create-game', (playerName) => {
    const roomId = generateNumericRoomId();
    const gameState = {
      roomId,
      players: [{
        id: socket.id,
        name: playerName,
        number: null,
        ready: false
      }],
      gameStarted: false,
      currentTurn: null,
      winner: null,
      guesses: []
    };
    
    gameRooms.set(roomId, gameState);
    socket.join(roomId);
    socket.emit('game-created', { roomId, playerId: socket.id });
    
    console.log(`✅ Game created: ${roomId} by ${playerName}`);
  });

  // Join existing game
  socket.on('join-game', ({ roomId, playerName }) => {
    const cleanRoomId = roomId.replace(/\D/g, '');
    const game = gameRooms.get(cleanRoomId);
    
    if (!game) {
      socket.emit('error', 'Game room not found');
      return;
    }
    
    if (game.players.length >= 2) {
      socket.emit('error', 'Game room is full');
      return;
    }
    
    game.players.push({
      id: socket.id,
      name: playerName,
      number: null,
      ready: false
    });
    
    socket.join(cleanRoomId);
    socket.emit('game-joined', { roomId: cleanRoomId, playerId: socket.id });
    
    io.to(cleanRoomId).emit('players-updated', game.players);
    
    console.log(`${playerName} joined room: ${cleanRoomId}`);
  });

  // Set player's number
  socket.on('set-number', ({ roomId, number }) => {
    const game = gameRooms.get(roomId);
    if (!game) return;
    
    const player = game.players.find(p => p.id === socket.id);
    if (player) {
      player.number = number;
      player.ready = true;
      
      io.to(roomId).emit('players-updated', game.players);
      
      if (game.players.length === 2 && game.players.every(p => p.ready)) {
        game.gameStarted = true;
        game.currentTurn = game.players[Math.floor(Math.random() * 2)].id;
        io.to(roomId).emit('game-started', {
          currentTurn: game.currentTurn,
          players: game.players.map(p => ({ id: p.id, name: p.name }))
        });
        console.log(`🎮 Game started in room ${roomId}`);
      }
    }
  });

  // Make a guess
  socket.on('make-guess', ({ roomId, guess, comparison }) => {
    const game = gameRooms.get(roomId);
    if (!game || !game.gameStarted || game.winner) return;
    
    if (game.currentTurn !== socket.id) {
      socket.emit('error', 'Not your turn');
      return;
    }
    
    const guesser = game.players.find(p => p.id === socket.id);
    const opponent = game.players.find(p => p.id !== socket.id);
    
    if (!guesser || !opponent) return;
    
    const opponentNumber = opponent.number;
    let result = '';
    
    if (parseInt(guess) === opponentNumber) {
      game.winner = {
        id: socket.id,
        name: guesser.name
      };
      
      io.to(roomId).emit('game-over', {
        winner: guesser.name,
        correctNumber: opponentNumber
      });
      
      console.log(`🏆 ${guesser.name} won in room ${roomId}`);
      
      setTimeout(() => {
        gameRooms.delete(roomId);
      }, 300000);
      
    } else {
      if (comparison === 'above') {
        result = guess > opponentNumber ? 'correct direction' : 'wrong direction';
      } else if (comparison === 'below') {
        result = guess < opponentNumber ? 'correct direction' : 'wrong direction';
      }
      
      game.guesses.push({
        player: guesser.name,
        guess,
        comparison,
        result,
        timestamp: Date.now()
      });
      
      game.currentTurn = opponent.id;
      
      io.to(roomId).emit('guess-result', {
        guesser: guesser.name,
        guess,
        comparison,
        result,
        nextTurn: opponent.id,
        guesses: game.guesses
      });
    }
  });

  // Leave room
  socket.on('leave-room', ({ roomId }) => {
    const game = gameRooms.get(roomId);
    if (game) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        io.to(roomId).emit('players-updated', game.players);
        io.to(roomId).emit('error', 'A player left the game');
        
        if (game.players.length === 0) {
          gameRooms.delete(roomId);
        }
      }
    }
    socket.leave(roomId);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    gameRooms.forEach((game, roomId) => {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const playerName = game.players[playerIndex].name;
        game.players.splice(playerIndex, 1);
        
        if (game.players.length === 0) {
          gameRooms.delete(roomId);
        } else {
          io.to(roomId).emit('players-updated', game.players);
          io.to(roomId).emit('error', `${playerName} disconnected`);
        }
      }
    });
  });
});

// Generate 6-digit numeric room ID
function generateNumericRoomId() {
  const min = 100000;
  const max = 999999;
  const roomId = Math.floor(Math.random() * (max - min + 1)) + min;
  return roomId.toString();
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log('🌐 NUMBER GUESSING GAME SERVER');
  console.log('=================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔢 Room codes: 6-digit numbers`);  
  console.log('=================================');
});
const path = require("path");

app.use(express.static(path.join(__dirname, "../client/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});