import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import WaitingRoom from './components/WaitingRoom';
import GameRoom from './components/GameRoom';
import GameBoard from './components/GameBoard';
import './styles/App.css';

const SOCKET_URL = 'https://number-game-backent.onrender.com';

function App() {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState({
    roomId: null,
    playerId: null,
    playerName: '',
    players: [],
    gameStarted: false,
    currentTurn: null,
    phase: 'guess',
    winner: null,
    guesses: []
  });
  const [error, setError] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [gameMessage, setGameMessage] = useState('');
  const [lastGuess, setLastGuess] = useState(null);
  const [autoClue, setAutoClue] = useState('');

  useEffect(() => {
    console.log('🔌 Connecting to server at:', SOCKET_URL);
    
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server!');
      setConnectionStatus('connected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setConnectionStatus('failed');
      setError('Cannot connect to game server.');
    });

    setSocket(newSocket);

    newSocket.on('game-created', ({ roomId, playerId }) => {
      console.log('🎮 Game created event received!');
      console.log('Room ID:', roomId);
      console.log('Player ID:', playerId);
      setGameState(prev => ({ ...prev, roomId, playerId }));
    });

    newSocket.on('game-joined', ({ roomId, playerId }) => {
      console.log('🎮 Game joined event received!');
      console.log('Room ID:', roomId);
      console.log('Player ID:', playerId);
      setGameState(prev => ({ ...prev, roomId, playerId }));
    });

    newSocket.on('players-updated', (players) => {
      console.log('👥 Players updated:', players);
      setGameState(prev => ({ ...prev, players }));
    });

    // CRITICAL FIX: Properly handle game-started event
    newSocket.on('game-started', (data) => {
      console.log('🎮 GAME STARTED EVENT RECEIVED! 🎮');
      console.log('Full data:', data);
      console.log('Current turn ID:', data.currentTurn);
      console.log('Phase:', data.phase);
      console.log('Players:', data.players);
      console.log('Starting player:', data.startingPlayer);
      
      // Update game state
      setGameState(prev => ({
        ...prev,
        gameStarted: true,
        currentTurn: data.currentTurn,
        phase: data.phase || 'guess',
        players: data.players.map(p => {
          const existingPlayer = prev.players.find(ep => ep.id === p.id);
          return existingPlayer ? { ...existingPlayer, name: p.name } : p;
        })
      }));
      
      setGameMessage(`🎮 Game started! ${data.startingPlayer} guesses first.`);
      
      // Force a re-render by setting a timeout
      setTimeout(() => {
        console.log('Game state after start:', gameState);
      }, 100);
    });

    newSocket.on('guess-made', ({ guesser, guess, waitingFor, autoClue, lastGuess }) => {
      console.log('🔍 Guess made:', guesser, guess);
      setGameState(prev => ({
        ...prev,
        phase: 'clueAndGuess',
        currentTurn: prev.players.find(p => p.name === waitingFor)?.id
      }));
      setLastGuess(lastGuess);
      setAutoClue(autoClue);
      setGameMessage(`${guesser} guessed ${guess}. ${waitingFor}, now give a clue and guess.`);
      setTimeout(() => setGameMessage(''), 5000);
    });

    newSocket.on('clue-and-guess-result', ({ responder, clue, guess, nextGuesser, autoClue, lastGuessValue, guesses, lastGuess }) => {
      console.log('💡 Clue and guess result:', responder, clue, guess);
      setGameState(prev => ({
        ...prev,
        currentTurn: prev.players.find(p => p.name === nextGuesser)?.id,
        phase: 'clueAndGuess',
        guesses
      }));
      setLastGuess(lastGuess);
      setAutoClue(autoClue);
      setGameMessage(`${responder} said: "My number is ${clue.toUpperCase()} ${lastGuessValue}" and guessed ${guess}. ${nextGuesser}, now give a clue and guess.`);
      setTimeout(() => setGameMessage(''), 5000);
    });

    newSocket.on('game-over', ({ winner, correctNumber }) => {
      console.log('🏆 Game over:', winner, 'won!');
      setGameState(prev => ({
        ...prev,
        winner: { name: winner, correctNumber }
      }));
    });

    newSocket.on('game-message', ({ text }) => {
      console.log('💬 Game message:', text);
      setGameMessage(text);
      setTimeout(() => setGameMessage(''), 5000);
    });

    newSocket.on('error', (message) => {
      console.error('❌ Server error:', message);
      setError(message);
      setTimeout(() => setError(''), 5000);
    });

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  const handleSetName = () => {
    if (nameInput.trim()) {
      setGameState(prev => ({ ...prev, playerName: nameInput }));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && nameInput.trim()) {
      handleSetName();
    }
  };

  const handleCreateGame = () => {
    if (gameState.playerName && socket) {
      console.log('🎮 Creating game for:', gameState.playerName);
      socket.emit('create-game', gameState.playerName);
    }
  };

  const handleJoinGame = (roomId) => {
    if (gameState.playerName && socket) {
      console.log('🔑 Joining game:', roomId, 'as:', gameState.playerName);
      socket.emit('join-game', { roomId, playerName: gameState.playerName });
    }
  };

  const handleSetNumber = (number) => {
    if (socket && gameState.roomId) {
      console.log('🔢 Setting number:', number);
      socket.emit('set-number', { roomId: gameState.roomId, number });
    }
  };

  const handleMakeGuess = (guess) => {
    if (socket && gameState.roomId && gameState.phase === 'guess') {
      console.log('🎯 Making guess:', guess);
      socket.emit('make-guess', {
        roomId: gameState.roomId,
        guess: parseInt(guess)
      });
    }
  };

  const handleClueAndGuess = (clue, guess) => {
    if (socket && gameState.roomId && gameState.phase === 'clueAndGuess') {
      console.log('💬 Clue and guess:', clue, guess);
      socket.emit('clue-and-guess', {
        roomId: gameState.roomId,
        clue: clue,
        guess: parseInt(guess)
      });
    }
  };

  const resetGame = () => {
    if (socket && gameState.roomId) {
      socket.emit('leave-room', { roomId: gameState.roomId });
    }
    setGameState({
      roomId: null,
      playerId: null,
      playerName: gameState.playerName,
      players: [],
      gameStarted: false,
      currentTurn: null,
      phase: 'guess',
      winner: null,
      guesses: []
    });
    setLastGuess(null);
    setGameMessage('');
    setAutoClue('');
  };

  if (connectionStatus === 'failed') {
    return (
      <div className="App">
        <header className="app-header">
          <h1>🎮 Number Guessing Game</h1>
        </header>
        <main className="app-main">
          <div className="error-card">
            <h2>❌ Cannot Connect to Server</h2>
            <p>Please check your internet connection and try again.</p>
            <p className="server-address">Server: {SOCKET_URL}</p>
            <button className="primary-btn" onClick={() => window.location.reload()}>
              Retry Connection
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Log game state changes for debugging
  useEffect(() => {
    console.log('📊 Game state updated:', {
      gameStarted: gameState.gameStarted,
      players: gameState.players,
      currentTurn: gameState.currentTurn,
      phase: gameState.phase
    });
  }, [gameState]);

  return (
    <div className="App">
      <header className="app-header">
        <h1>🎮 Number Guessing Game</h1>
        {connectionStatus === 'connected' && (
          <div className="connection-status">✅ Connected</div>
        )}
      </header>

      {error && <div className="error-message">{error}</div>}

      <main className="app-main">
        {!gameState.playerName ? (
          <div className="name-input-container">
            <h2>Enter Your Name</h2>
            <input
              type="text"
              placeholder="Your name..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            <button className="primary-btn" onClick={handleSetName} disabled={!nameInput.trim()}>
              Continue
            </button>
          </div>
        ) : !gameState.roomId ? (
          <WaitingRoom
            playerName={gameState.playerName}
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
          />
        ) : !gameState.gameStarted ? (
          <GameRoom
            roomId={gameState.roomId}
            players={gameState.players}
            playerId={gameState.playerId}
            onSetNumber={handleSetNumber}
          />
        ) : (
          <GameBoard
            gameState={gameState}
            playerId={gameState.playerId}
            onMakeGuess={handleMakeGuess}
            onClueAndGuess={handleClueAndGuess}
            gameMessage={gameMessage}
            lastGuess={lastGuess}
            autoClue={autoClue}
            onReset={resetGame}
          />
        )}
      </main>
    </div>
  );
}

export default App;