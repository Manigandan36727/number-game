import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './styles/App.css';

const SERVER_URL = 'https://number-game-backent.onrender.com';

function App() {
  // ALL HOOKS MUST BE AT THE TOP - NO CONDITIONAL HOOKS!
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [phase, setPhase] = useState('guess');
  const [winner, setWinner] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [lastGuess, setLastGuess] = useState(null);
  const [autoClue, setAutoClue] = useState('');
  const [error, setError] = useState('');
  const [gameMessage, setGameMessage] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [clueInput, setClueInput] = useState('');
  const [clueGuessInput, setClueGuessInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [numberInput, setNumberInput] = useState(''); // For setting number
  const [joinRoomInput, setJoinRoomInput] = useState(''); // For join room

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    
    newSocket.on('connect', () => {
      setConnectionStatus('connected');
    });
    
    newSocket.on('connect_error', () => {
      setConnectionStatus('failed');
    });
    
    newSocket.on('game-created', ({ roomId, playerId }) => {
      setRoomId(roomId);
      setPlayerId(playerId);
    });
    
    newSocket.on('game-joined', ({ roomId, playerId }) => {
      setRoomId(roomId);
      setPlayerId(playerId);
    });
    
    newSocket.on('players-updated', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });
    
    newSocket.on('game-started', (data) => {
      setGameStarted(true);
      setCurrentTurn(data.currentTurn);
      setPhase(data.phase);
      setPlayers(data.players);
      setGameMessage(`${data.startingPlayer} guesses first!`);
      setTimeout(() => setGameMessage(''), 3000);
    });
    
    newSocket.on('guess-made', ({ guesser, guess, waitingFor, autoClue, lastGuess }) => {
      setPhase('clueAndGuess');
      setCurrentTurn(players.find(p => p.name === waitingFor)?.id);
      setLastGuess(lastGuess);
      setAutoClue(autoClue);
      setGameMessage(`${guesser} guessed ${guess}! Your turn to give clue and guess.`);
      setTimeout(() => setGameMessage(''), 3000);
    });
    
    newSocket.on('clue-and-guess-result', ({ responder, clue, guess, nextGuesser, guesses, lastGuess }) => {
      setCurrentTurn(players.find(p => p.name === nextGuesser)?.id);
      setPhase('clueAndGuess');
      setGuesses(guesses);
      setLastGuess(lastGuess);
      setGameMessage(`${responder} gave clue: ${clue}. Your turn!`);
      setTimeout(() => setGameMessage(''), 3000);
    });
    
    newSocket.on('game-over', ({ winner, correctNumber }) => {
      setWinner({ name: winner, correctNumber });
    });
    
    newSocket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, [players]);

  const handleSetName = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput);
    }
  };

  const handleCreateGame = () => {
    if (playerName && socket) {
      socket.emit('create-game', playerName);
    }
  };

  const handleJoinGame = () => {
    if (playerName && socket && joinRoomInput) {
      socket.emit('join-game', { roomId: joinRoomInput, playerName });
    }
  };

  const handleSetNumber = () => {
    if (socket && roomId && numberInput) {
      socket.emit('set-number', { roomId, number: parseInt(numberInput) });
    }
  };

  const handleMakeGuess = () => {
    if (socket && roomId && guessInput) {
      socket.emit('make-guess', { roomId, guess: parseInt(guessInput) });
      setGuessInput('');
    }
  };

  const handleClueAndGuess = () => {
    if (socket && roomId && clueInput && clueGuessInput) {
      socket.emit('clue-and-guess', { roomId, clue: clueInput, guess: parseInt(clueGuessInput) });
      setClueInput('');
      setClueGuessInput('');
    }
  };

  // Helper to check if both players are ready
  const bothReady = players.length === 2 && players.every(p => p.ready);
  const currentPlayer = players.find(p => p.id === playerId);
  const opponent = players.find(p => p.id !== playerId);
  const isMyTurn = currentTurn === playerId;
  const isGuessPhase = phase === 'guess' && isMyTurn;
  const isCluePhase = phase === 'clueAndGuess' && isMyTurn;

  // Connection failed screen
  if (connectionStatus === 'failed') {
    return (
      <div className="container">
        <h1>🎮 Number Guessing Game</h1>
        <div className="card">
          <h2>Cannot connect to server</h2>
          <p>Please check your internet connection and try again.</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Name Entry Screen
  if (!playerName) {
    return (
      <div className="container">
        <h1>🎮 Number Guessing Game</h1>
        <div className="card">
          <h2>Enter Your Name</h2>
          <input 
            type="text" 
            placeholder="Your name" 
            value={nameInput} 
            onChange={(e) => setNameInput(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && handleSetName()} 
          />
          <button onClick={handleSetName}>Continue</button>
        </div>
      </div>
    );
  }

  // Waiting Room (Create or Join)
  if (!roomId) {
    return (
      <div className="container">
        <h1>🎮 Number Guessing Game</h1>
        <div className="card">
          <h2>Welcome, {playerName}!</h2>
          <button onClick={handleCreateGame}>Create Game Room</button>
          <div className="divider">OR</div>
          <input 
            type="text" 
            placeholder="Enter 6-digit Room Code" 
            maxLength="6" 
            value={joinRoomInput}
            onChange={(e) => setJoinRoomInput(e.target.value)}
          />
          <button onClick={handleJoinGame}>Join Game</button>
        </div>
      </div>
    );
  }

  // Game Room (Set Number)
  if (!gameStarted) {
    const playerReady = currentPlayer?.ready;
    
    return (
      <div className="container">
        <h1>🎮 Number Guessing Game</h1>
        <div className="card">
          <h2>Game Room: {roomId}</h2>
          <p>Share this code with your friend</p>
          <div className="players">
            {players.map(p => (
              <div key={p.id} className={`player ${p.ready ? 'ready' : ''}`}>
                <strong>{p.name}</strong> {p.ready ? '✅ Ready' : '⏳ Setting number...'}
              </div>
            ))}
          </div>
          {!playerReady ? (
            <div>
              <h3>Set Your Secret Number</h3>
              <input 
                type="number" 
                placeholder="0-100" 
                value={numberInput} 
                onChange={(e) => setNumberInput(e.target.value)} 
              />
              <button onClick={handleSetNumber}>Set Number</button>
            </div>
          ) : !bothReady ? (
            <p>Waiting for opponent to set their number...</p>
          ) : null}
          {bothReady && <p>🎮 Game starting...</p>}
        </div>
      </div>
    );
  }

  // Game Board - Winner Screen
  if (winner) {
    const isWinner = winner.name === currentPlayer?.name;
    return (
      <div className="container">
        <h1>🎮 Number Guessing Game</h1>
        <div className="card">
          <h2>Game Over!</h2>
          {isWinner ? <h1 className="winner">🎉 YOU WIN! 🎉</h1> : <h1 className="loser">{winner.name} wins!</h1>}
          <p>The correct number was: <strong>{winner.correctNumber}</strong></p>
          <button onClick={() => window.location.reload()}>Play Again</button>
        </div>
      </div>
    );
  }

  // Game Board - Main Game
  return (
    <div className="container">
      <h1>🎮 Number Guessing Game</h1>
      {gameMessage && <div className="message">{gameMessage}</div>}
      {error && <div className="error">{error}</div>}
      
      <div className="game-header">
        <div className="turn-indicator">
          {isGuessPhase && <span className="your-turn">✨ YOUR TURN TO GUESS! ✨</span>}
          {isCluePhase && <span className="your-turn">📢 GIVE CLUE & GUESS! 📢</span>}
          {!isMyTurn && <span>⏳ Waiting for {opponent?.name}...</span>}
        </div>
        <div className="players-info">
          <span className={isMyTurn ? 'active' : ''}>You: {currentPlayer?.name}</span>
          <span>VS</span>
          <span>Opponent: {opponent?.name}</span>
        </div>
      </div>

      <div className="game-board">
        {isGuessPhase ? (
          <div className="guess-section">
            <h2>Guess {opponent?.name}'s Number</h2>
            <input 
              type="number" 
              placeholder="Enter your guess (0-100)" 
              value={guessInput} 
              onChange={(e) => setGuessInput(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && handleMakeGuess()} 
            />
            <button onClick={handleMakeGuess}>SUBMIT GUESS</button>
          </div>
        ) : isCluePhase ? (
          <div className="clue-section">
            <h2>Give a Clue About YOUR Number</h2>
            <p>{opponent?.name} guessed: <strong>{lastGuess?.guessValue}</strong></p>
            <div className="clue-buttons">
              <button className={clueInput === 'above' ? 'selected' : ''} onClick={() => setClueInput('above')}>⬆️ ABOVE</button>
              <button className={clueInput === 'below' ? 'selected' : ''} onClick={() => setClueInput('below')}>⬇️ BELOW</button>
            </div>
            <h2>Now Guess {opponent?.name}'s Number</h2>
            <input 
              type="number" 
              placeholder="Enter your guess (0-100)" 
              value={clueGuessInput} 
              onChange={(e) => setClueGuessInput(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && handleClueAndGuess()} 
            />
            <button onClick={handleClueAndGuess}>SUBMIT CLUE & GUESS</button>
          </div>
        ) : (
          <div className="waiting">Waiting for {opponent?.name}...</div>
        )}

        <div className="history">
          <h3>📜 Game History</h3>
          {guesses.length === 0 ? <p>No moves yet</p> : guesses.map((g, i) => (
            <div key={i} className="history-item">
              <strong>{g.guesser}</strong> guessed {g.guess} → <strong>{g.responder}</strong> said: {g.clueGiven === 'above' ? '⬆️ ABOVE' : '⬇️ BELOW'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;