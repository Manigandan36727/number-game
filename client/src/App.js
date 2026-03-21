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
    winner: null,
    guesses: []
  });
  const [error, setError] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [gameMessage, setGameMessage] = useState('');
  const [lastGuess, setLastGuess] = useState(null);

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
      setGameState(prev => ({ ...prev, roomId, playerId }));
    });

    newSocket.on('game-joined', ({ roomId, playerId }) => {
      setGameState(prev => ({ ...prev, roomId, playerId }));
    });

    newSocket.on('players-updated', (players) => {
      setGameState(prev => ({ ...prev, players }));
    });

    newSocket.on('game-started', ({ currentTurn, players }) => {
      setGameState(prev => ({
        ...prev,
        gameStarted: true,
        currentTurn,
        players: prev.players.map(p => {
          const updatedPlayer = players.find(up => up.id === p.id);
          return updatedPlayer ? { ...p, name: updatedPlayer.name } : p;
        })
      }));
    });

    newSocket.on('guess-result', ({ guesser, guess, clue, nextTurn, guesses, lastGuess }) => {
      setGameState(prev => ({
        ...prev,
        currentTurn: nextTurn,
        guesses
      }));
      setLastGuess(lastGuess);
      setTimeout(() => setLastGuess(null), 5000);
    });

    newSocket.on('game-over', ({ winner, correctNumber }) => {
      setGameState(prev => ({
        ...prev,
        winner: { name: winner, correctNumber }
      }));
    });

    newSocket.on('game-message', ({ text }) => {
      setGameMessage(text);
      setTimeout(() => setGameMessage(''), 5000);
    });

    newSocket.on('error', (message) => {
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
      socket.emit('create-game', gameState.playerName);
    }
  };

  const handleJoinGame = (roomId) => {
    if (gameState.playerName && socket) {
      socket.emit('join-game', { roomId, playerName: gameState.playerName });
    }
  };

  const handleSetNumber = (number) => {
    if (socket && gameState.roomId) {
      socket.emit('set-number', { roomId: gameState.roomId, number });
    }
  };

  const handleMakeGuess = (guess) => {
    if (socket && gameState.roomId) {
      socket.emit('make-guess', {
        roomId: gameState.roomId,
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
      winner: null,
      guesses: []
    });
    setLastGuess(null);
    setGameMessage('');
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
            <button className="primary-btn" onClick={() => window.location.reload()}>
              Retry Connection
            </button>
          </div>
        </main>
      </div>
    );
  }

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
            gameMessage={gameMessage}
            lastGuess={lastGuess}
            onReset={resetGame}
          />
        )}
      </main>
    </div>
  );
}

export default App;
