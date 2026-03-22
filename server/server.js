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

const gameRooms = new Map();

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Number Guessing Game Server is running',
    rooms: gameRooms.size 
  });
});

app.get('/api/room/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const exists = gameRooms.has(roomId);
  res.json({ exists, roomId });
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create game
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
      waitingForClue: false,
      lastGuess: null,
      winner: null,
      guesses: []
    };
    
    gameRooms.set(roomId, gameState);
    socket.join(roomId);
    socket.emit('game-created', { roomId, playerId: socket.id });
    console.log(`✅ Game created: ${roomId} by ${playerName}`);
  });

  // Join game
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

  // Set number
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
        // Player 1 goes first (guesses)
        game.currentTurn = game.players[0].id;
        game.waitingForClue = false;
        
        io.to(roomId).emit('game-started', {
          currentTurn: game.currentTurn,
          waitingForClue: false,
          players: game.players.map(p => ({ id: p.id, name: p.name }))
        });
        
        const startingPlayer = game.players.find(p => p.id === game.currentTurn);
        io.to(roomId).emit('game-message', {
          text: `🎮 Game started! ${startingPlayer.name} guesses first.`
        });
        
        console.log(`🎮 Game started in room ${roomId}`);
      }
    }
  });

  // Player makes a guess
  socket.on('make-guess', ({ roomId, guess }) => {
    const game = gameRooms.get(roomId);
    if (!game || !game.gameStarted || game.winner) return;
    
    // Check if it's this player's turn and not waiting for clue
    if (game.currentTurn !== socket.id || game.waitingForClue) {
      socket.emit('error', 'Not your turn to guess');
      return;
    }
    
    const guesser = game.players.find(p => p.id === socket.id);
    const opponent = game.players.find(p => p.id !== socket.id);
    
    if (!guesser || !opponent) return;
    
    const opponentNumber = opponent.number;
    const guessValue = parseInt(guess);
    
    // Check if guess is correct
    if (guessValue === opponentNumber) {
      game.winner = { id: socket.id, name: guesser.name };
      
      io.to(roomId).emit('game-over', {
        winner: guesser.name,
        correctNumber: opponentNumber
      });
      
      console.log(`🏆 ${guesser.name} won in room ${roomId}`);
      setTimeout(() => gameRooms.delete(roomId), 300000);
    } else {
      // Store the guess and switch to clue mode
      game.lastGuess = {
        guesserId: socket.id,
        guesserName: guesser.name,
        guessValue: guessValue,
        opponentNumber: opponentNumber
      };
      
      // Now it's opponent's turn to give clue
      game.currentTurn = opponent.id;
      game.waitingForClue = true;
      
      io.to(roomId).emit('guess-made', {
        guesser: guesser.name,
        guess: guessValue,
        waitingFor: opponent.name,
        lastGuess: game.lastGuess
      });
      
      io.to(roomId).emit('game-message', {
        text: `${guesser.name} guessed ${guessValue}. ${opponent.name}, please give a clue (ABOVE/BELOW).`
      });
      
      console.log(`${guesser.name} guessed ${guessValue}`);
    }
  });

  // Player gives clue
  socket.on('give-clue', ({ roomId, clue }) => {
    const game = gameRooms.get(roomId);
    if (!game || !game.gameStarted || game.winner) return;
    
    // Check if it's this player's turn and waiting for clue
    if (game.currentTurn !== socket.id || !game.waitingForClue) {
      socket.emit('error', 'Not your turn to give clue');
      return;
    }
    
    const responder = game.players.find(p => p.id === socket.id);
    const opponent = game.players.find(p => p.id !== socket.id);
    
    if (!responder || !opponent || !game.lastGuess) return;
    
    const respondersNumber = responder.number;
    const lastGuessValue = game.lastGuess.guessValue;
    
    // Record the clue
    game.guesses.push({
      guesser: game.lastGuess.guesserName,
      guess: lastGuessValue,
      clueGiven: clue,
      responder: responder.name,
      timestamp: Date.now()
    });
    
    // Switch back to opponent's turn for guessing
    game.currentTurn = opponent.id;
    game.waitingForClue = false;
    game.lastGuess = null;
    
    io.to(roomId).emit('clue-given', {
      responder: responder.name,
      clue: clue,
      nextGuesser: opponent.name,
      lastGuessValue: lastGuessValue,
      guesses: game.guesses
    });
    
    io.to(roomId).emit('game-message', {
      text: `${responder.name} said: "My number is ${clue.toUpperCase()} ${lastGuessValue}". ${opponent.name}'s turn to guess.`
    });
    
    console.log(`${responder.name} gave clue: ${clue.toUpperCase()} ${lastGuessValue}`);
  });

  socket.on('leave-room', ({ roomId }) => {
    const game = gameRooms.get(roomId);
    if (game) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const playerName = game.players[playerIndex].name;
        game.players.splice(playerIndex, 1);
        io.to(roomId).emit('players-updated', game.players);
        io.to(roomId).emit('error', `${playerName} left the game`);
        
        if (game.players.length === 0) gameRooms.delete(roomId);
      }
    }
    socket.leave(roomId);
  });

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

function generateNumericRoomId() {
  const min = 100000;
  const max = 999999;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log('🌐 NUMBER GUESSING GAME SERVER');
  console.log('=================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔢 Room codes: 6-digit numbers`);
  console.log(`🎮 Game flow: Guess → Give clue → Switch turns`);
  console.log('=================================');
});