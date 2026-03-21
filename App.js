import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import WaitingRoom from './components/WaitingRoom';
import GameRoom from './components/GameRoom';
import GameBoard from './components/GameBoard';
import './styles/App.css';

const SOCKET_URL = 'https://number-game-backend-9j09.onrender.com/';

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

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
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

    return () => newSocket.close();
  }, []);

  const handleSetName = (name) => {
    setGameState(prev => ({ ...prev, playerName: name }));
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

  return (
    <div className="App">
      <header className="app-header">
        <h1>🎮 Number Guessing Game</h1>
      </header>

      {error && <div className="error-message">{error}</div>}

      <main className="app-main">
        {!gameState.playerName ? (
          <div className="name-input-container">
            <h2>Enter Your Name</h2>
            <input
              type="text"
              placeholder="Your name..."
              value={gameState.playerName}
              onChange={(e) => handleSetName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSetName(e.target.value)}
            />
            <button onClick={() => handleSetName(gameState.playerName)}>
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