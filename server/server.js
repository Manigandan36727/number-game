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
      phase: 'guess',
      lastGuess: null,
      winner: null,
      guesses: []
    };
    
    gameRooms.set(roomId, gameState);
    socket.join(roomId);
    socket.emit('game-created', { roomId, playerId: socket.id });
    console.log(`✅ Game created: ${roomId} by ${playerName}`);
  });

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

  socket.on('set-number', ({ roomId, number }) => {
    const game = gameRooms.get(roomId);
    if (!game) return;
    
    const player = game.players.find(p => p.id === socket.id);
    if (player) {
      player.number = number;
      player.ready = true;
      
      console.log(`${player.name} set number: ${number}`);
      io.to(roomId).emit('players-updated', game.players);
      
      // Check if both players are ready
      if (game.players.length === 2 && game.players[0].ready && game.players[1].ready) {
        console.log('✅ Both players ready! Starting game...');
        
        game.gameStarted = true;
        // Player who joined first (index 0) goes first
        game.currentTurn = game.players[0].id;
        game.phase = 'guess';
        
        const startingPlayer = game.players[0].name;
        
        io.to(roomId).emit('game-started', {
          currentTurn: game.currentTurn,
          phase: 'guess',
          players: game.players.map(p => ({ id: p.id, name: p.name })),
          startingPlayer: startingPlayer
        });
        
        io.to(roomId).emit('game-message', {
          text: `🎮 Game started! ${startingPlayer} guesses first.`
        });
        
        console.log(`🎮 Game started in room ${roomId}`);
      }
    }
  });

  // Player makes a guess (first turn)
  socket.on('make-guess', ({ roomId, guess }) => {
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
    const guessValue = parseInt(guess);
    
    console.log(`${guesser.name} guessed ${guessValue}, opponent number is ${opponentNumber}`);
    
    // Check if guess is correct
    if (guessValue === opponentNumber) {
      game.winner = { id: socket.id, name: guesser.name };
      io.to(roomId).emit('game-over', {
        winner: guesser.name,
        correctNumber: opponentNumber
      });
      console.log(`🏆 ${guesser.name} won in room ${roomId}`);
      setTimeout(() => gameRooms.delete(roomId), 300000);
      return;
    }
    
    // Store the guess
    game.lastGuess = {
      guesserId: socket.id,
      guesserName: guesser.name,
      guessValue: guessValue
    };
    
    // Determine auto clue for the opponent
    let autoClue = opponentNumber > guessValue ? 'above' : 'below';
    
    // Switch to opponent's turn for clue and guess
    game.currentTurn = opponent.id;
    game.phase = 'clueAndGuess';
    
    io.to(roomId).emit('guess-made', {
      guesser: guesser.name,
      guess: guessValue,
      waitingFor: opponent.name,
      autoClue: autoClue,
      lastGuess: game.lastGuess
    });
    
    io.to(roomId).emit('game-message', {
      text: `${guesser.name} guessed ${guessValue}. ${opponent.name}, now give a clue and guess.`
    });
    
    console.log(`${guesser.name} guessed ${guessValue} → ${autoClue.toUpperCase()}`);
  });

  // Player gives clue AND then makes a guess (turns 2, 3, 4...)
  socket.on('clue-and-guess', ({ roomId, clue, guess }) => {
    const game = gameRooms.get(roomId);
    if (!game || !game.gameStarted || game.winner) return;
    
    if (game.currentTurn !== socket.id || game.phase !== 'clueAndGuess') {
      socket.emit('error', 'Not your turn to give clue and guess');
      return;
    }
    
    const responder = game.players.find(p => p.id === socket.id);
    const opponent = game.players.find(p => p.id !== socket.id);
    
    if (!responder || !opponent || !game.lastGuess) return;
    
    const lastGuessValue = game.lastGuess.guessValue;
    const guessValue = parseInt(guess);
    
    console.log(`${responder.name} gave clue: ${clue} ${lastGuessValue} and guessed ${guessValue}`);
    
    // Record the clue
    game.guesses.push({
      guesser: game.lastGuess.guesserName,
      guess: lastGuessValue,
      clueGiven: clue,
      responder: responder.name,
      timestamp: Date.now()
    });
    
    // Check if the guess is correct
    if (guessValue === opponent.number) {
      game.winner = { id: socket.id, name: responder.name };
      io.to(roomId).emit('game-over', {
        winner: responder.name,
        correctNumber: opponent.number
      });
      console.log(`🏆 ${responder.name} won in room ${roomId}`);
      setTimeout(() => gameRooms.delete(roomId), 300000);
      return;
    }
    
    // Store new guess for next round
    game.lastGuess = {
      guesserId: socket.id,
      guesserName: responder.name,
      guessValue: guessValue
    };
    
    // Determine auto clue for the opponent
    let autoClue = opponent.number > guessValue ? 'above' : 'below';
    
    // Switch back to opponent's turn
    game.currentTurn = opponent.id;
    game.phase = 'clueAndGuess';
    
    io.to(roomId).emit('clue-and-guess-result', {
      responder: responder.name,
      clue: clue,
      guess: guessValue,
      nextGuesser: opponent.name,
      autoClue: autoClue,
      lastGuessValue: lastGuessValue,
      guesses: game.guesses,
      lastGuess: game.lastGuess
    });
    
    io.to(roomId).emit('game-message', {
      text: `${responder.name} said: "My number is ${clue.toUpperCase()} ${lastGuessValue}" and guessed ${guessValue}. ${opponent.name}, now give a clue and guess.`
    });
    
    console.log(`${responder.name} gave clue: ${clue.toUpperCase()} ${lastGuessValue} and guessed ${guessValue}`);
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
  console.log(`🎮 Game flow: Turn 1: Guess | Turns 2+: Clue + Guess`);
  console.log('=================================');
});