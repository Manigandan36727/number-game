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
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
    });

    newSocket.on('connect_error', () => {
      setConnectionStatus('failed');
    });

    newSocket.on('game-created', ({ roomId, playerId }) => {
      setGameState(prev => ({ ...prev, roomId, playerId }));
    });

    newSocket.on('game-joined', ({ roomId, playerId }) => {
      setGameState(prev => ({ ...prev, roomId, playerId }));
    });

    newSocket.on('players-updated', (players) => {
      setGameState(prev => ({ ...prev, players }));
    });

    newSocket.on('game-started', (data) => {
      console.log('Game started!', data);
      setGameState(prev => ({
        ...prev,
        gameStarted: true,
        currentTurn: data.currentTurn,
        phase: data.phase,
        players: data.players
      }));
      setGameMessage(`Game started! ${data.startingPlayer} guesses first.`);
      setTimeout(() => setGameMessage(''), 3000);
    });

    newSocket.on('guess-made', ({ guesser, guess, waitingFor, autoClue, lastGuess }) => {
      setGameState(prev => ({
        ...prev,
        phase: 'clueAndGuess',
        currentTurn: prev.players.find(p => p.name === waitingFor)?.id
      }));
      setLastGuess(lastGuess);
      setAutoClue(autoClue);
      setGameMessage(`${guesser} guessed ${guess}. Your turn!`);
      setTimeout(() => setGameMessage(''), 3000);
    });

    newSocket.on('clue-and-guess-result', ({ responder, clue, guess, nextGuesser, autoClue, guesses, lastGuess }) => {
      setGameState(prev => ({
        ...prev,
        currentTurn: prev.players.find(p => p.name === nextGuesser)?.id,
        phase: 'clueAndGuess',
        guesses
      }));
      setLastGuess(lastGuess);
      setAutoClue(autoClue);
      setGameMessage(`${responder} gave clue: ${clue}. Your turn!`);
      setTimeout(() => setGameMessage(''), 3000);
    });

    newSocket.on('game-over', ({ winner, correctNumber }) => {
      setGameState(prev => ({
        ...prev,
        winner: { name: winner, correctNumber }
      }));
    });

    newSocket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const handleSetName = () => {
    if (nameInput.trim()) {
      setGameState(prev => ({ ...prev, playerName: nameInput }));
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
    if (socket && gameState.roomId && gameState.phase === 'guess') {
      socket.emit('make-guess', { roomId: gameState.roomId, guess: parseInt(guess) });
    }
  };

  const handleClueAndGuess = (clue, guess) => {
    if (socket && gameState.roomId && gameState.phase === 'clueAndGuess') {
      socket.emit('clue-and-guess', { roomId: gameState.roomId, clue, guess: parseInt(guess) });
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
        <header><h1>Number Guessing Game</h1></header>
        <main>
          <div className="error-card">
            <h2>Cannot Connect to Server</h2>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>Number Guessing Game</h1>
      </header>

      {error && <div className="error-message">{error}</div>}
      {gameMessage && <div className="game-message">{gameMessage}</div>}

      <main>
        {!gameState.playerName ? (
          <div className="name-input-container">
            <h2>Enter Your Name</h2>
            <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSetName()} />
            <button onClick={handleSetName}>Continue</button>
          </div>
        ) : !gameState.roomId ? (
          <WaitingRoom playerName={gameState.playerName} onCreateGame={handleCreateGame} onJoinGame={handleJoinGame} />
        ) : !gameState.gameStarted ? (
          <GameRoom roomId={gameState.roomId} players={gameState.players} playerId={gameState.playerId} onSetNumber={handleSetNumber} />
        ) : (
          <GameBoard gameState={gameState} playerId={gameState.playerId} onMakeGuess={handleMakeGuess} onClueAndGuess={handleClueAndGuess} lastGuess={lastGuess} autoClue={autoClue} onReset={resetGame} />
        )}
      </main>
    </div>
  );
}

export default App;