import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import WaitingRoom from './components/WaitingRoom';
import GameRoom from './components/GameRoom';
import GameBoard from './components/GameBoard';
import './styles/App.css';

// For LOCAL TESTING: Use your computer's IP
// const SOCKET_URL = 'http://10.153.28.197:5000';

// For PRODUCTION: Replace with your cloud server URL
const SOCKET_URL = 'https://number-game-backent.onrender.com'; // CHANGE THIS AFTER DEPLOYMENT!

// For development, use localhost
const DEV_URL = 'https://number-game-frontend.onrender.com';

// Choose the right URL based on environment
const SERVER_URL = process.env.NODE_ENV === 'production' ? SOCKET_URL : DEV_URL;

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
  const [serverInfo, setServerInfo] = useState(null);

  useEffect(() => {
    console.log('🔌 Connecting to server at:', SERVER_URL);
    
    // Check server health
    fetch(`${SERVER_URL}/`)
      .then(res => res.json())
      .then(data => {
        setServerInfo(data);
        console.log('✅ Server online:', data);
      })
      .catch(err => {
        console.error('❌ Server offline:', err);
        setError('Cannot reach game server. Please try again later.');
      });
    
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server!');
      setConnectionStatus('connected');
      setError('');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setConnectionStatus('failed');
      setError('Cannot connect to game server. Please check your internet and try again.');
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

    newSocket.on('guess-result', ({ guesser, guess, comparison, result, nextTurn, guesses }) => {
      setGameState(prev => ({
        ...prev,
        currentTurn: nextTurn,
        guesses
      }));
    });

    newSocket.on('game-over', ({ winner, correctNumber }) => {
      setGameState(prev => ({
        ...prev,
        winner: { name: winner, correctNumber }
      }));
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

  const handleMakeGuess = (guess, comparison) => {
    if (socket && gameState.roomId) {
      socket.emit('make-guess', {
        roomId: gameState.roomId,
        guess: parseInt(guess),
        comparison
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
  };

  // Show connection error if server is not reachable
  if (connectionStatus === 'failed') {
    return (
      <div className="App">
        <header className="app-header">
          <h1>🎮 Number Guessing Game</h1>
        </header>
        <main className="app-main">
          <div className="error-card">
            <h2>❌ Cannot Connect to Server</h2>
            <p>Please check:</p>
            <ul>
              <li>✅ Your internet connection</li>
              <li>✅ The game server is online</li>
              <li>✅ Try again in a few moments</li>
            </ul>
            <p className="server-address">Server: {SERVER_URL}</p>
            <button 
              className="primary-btn" 
              onClick={() => window.location.reload()}
            >
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
          <div className="connection-status">
            ✅ Online {serverInfo && `(${serverInfo.rooms} active rooms)`}
          </div>
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
            <button 
              className="primary-btn" 
              onClick={handleSetName}
              disabled={!nameInput.trim()}
            >
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
            onReset={resetGame}
          />
        )}
      </main>
    </div>
  );
}

export default App;