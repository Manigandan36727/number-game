const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

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

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-game', (playerName) => {
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
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
    console.log(`Game created: ${roomId} by ${playerName}`);
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
      
      io.to(roomId).emit('players-updated', game.players);
      
      // Check if both players are ready
      if (game.players.length === 2 && game.players[0].ready && game.players[1].ready) {
        game.gameStarted = true;
        game.currentTurn = game.players[0].id;
        game.phase = 'guess';
        
        io.to(roomId).emit('game-started', {
          currentTurn: game.currentTurn,
          phase: 'guess',
          players: game.players.map(p => ({ id: p.id, name: p.name })),
          startingPlayer: game.players[0].name
        });
        
        console.log(`GAME STARTED in room ${roomId}`);
      }
    }
  });

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
    
    const guessValue = parseInt(guess);
    const opponentNumber = opponent.number;
    
    if (guessValue === opponentNumber) {
      game.winner = { id: socket.id, name: guesser.name };
      io.to(roomId).emit('game-over', {
        winner: guesser.name,
        correctNumber: opponentNumber
      });
      return;
    }
    
    const clue = opponentNumber > guessValue ? 'above' : 'below';
    
    game.lastGuess = {
      guesserName: guesser.name,
      guessValue: guessValue
    };
    
    game.currentTurn = opponent.id;
    game.phase = 'clueAndGuess';
    
    io.to(roomId).emit('guess-made', {
      guesser: guesser.name,
      guess: guessValue,
      waitingFor: opponent.name,
      autoClue: clue,
      lastGuess: game.lastGuess
    });
  });

  socket.on('clue-and-guess', ({ roomId, clue, guess }) => {
    const game = gameRooms.get(roomId);
    if (!game || !game.gameStarted || game.winner) return;
    
    if (game.currentTurn !== socket.id || game.phase !== 'clueAndGuess') {
      socket.emit('error', 'Not your turn');
      return;
    }
    
    const responder = game.players.find(p => p.id === socket.id);
    const opponent = game.players.find(p => p.id !== socket.id);
    
    if (!responder || !opponent || !game.lastGuess) return;
    
    const guessValue = parseInt(guess);
    const opponentNumber = opponent.number;
    
    game.guesses.push({
      guesser: game.lastGuess.guesserName,
      guess: game.lastGuess.guessValue,
      clueGiven: clue,
      responder: responder.name
    });
    
    if (guessValue === opponentNumber) {
      game.winner = { id: socket.id, name: responder.name };
      io.to(roomId).emit('game-over', {
        winner: responder.name,
        correctNumber: opponentNumber
      });
      return;
    }
    
    const autoClue = opponentNumber > guessValue ? 'above' : 'below';
    
    game.lastGuess = {
      guesserName: responder.name,
      guessValue: guessValue
    };
    
    game.currentTurn = opponent.id;
    game.phase = 'clueAndGuess';
    
    io.to(roomId).emit('clue-and-guess-result', {
      responder: responder.name,
      clue: clue,
      guess: guessValue,
      nextGuesser: opponent.name,
      autoClue: autoClue,
      lastGuessValue: game.lastGuess.guessValue,
      guesses: game.guesses,
      lastGuess: game.lastGuess
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});