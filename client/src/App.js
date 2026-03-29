import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './styles/App.css';

const SERVER_URL = 'https://number-game-backent.onrender.com';

function App() {
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
  const [error, setError] = useState('');
  const [gameMessage, setGameMessage] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [clueInput, setClueInput] = useState('');
  const [clueGuessInput, setClueGuessInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [numberInput, setNumberInput] = useState('');
  const [joinRoomInput, setJoinRoomInput] = useState('');

  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnectionStatus('connected');
      setError('');
    });
    
    newSocket.on('connect_error', (err) => {
      console.log('❌ Connection error:', err.message);
      setConnectionStatus('failed');
      setError('Cannot connect to server. Please refresh.');
    });
    
    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      setConnectionStatus('failed');
      setError('Disconnected from server. Please refresh.');
    });
    
    newSocket.on('game-created', ({ roomId, playerId }) => {
      console.log('🎮 Game created:', roomId);
      setRoomId(roomId);
      setPlayerId(playerId);
    });
    
    newSocket.on('game-joined', ({ roomId, playerId }) => {
      console.log('🎮 Game joined:', roomId);
      setRoomId(roomId);
      setPlayerId(playerId);
    });
    
    newSocket.on('players-updated', (updatedPlayers) => {
      console.log('👥 Players updated:', updatedPlayers);
      setPlayers(updatedPlayers);
    });
    
    newSocket.on('game-started', (data) => {
      console.log('🚀 GAME STARTED!', data);
      setGameStarted(true);
      setCurrentTurn(data.currentTurn);
      setPhase(data.phase);
      setPlayers(data.players);
      setGameMessage(`Game started! ${data.startingPlayer} guesses first.`);
      setTimeout(() => setGameMessage(''), 4000);
    });
    
    newSocket.on('guess-made', ({ guesser, guess, waitingFor, autoClue, lastGuess }) => {
      console.log('🔍 Guess made:', guesser, guess);
      setPhase('clueAndGuess');
      const waitingPlayer = players.find(p => p.name === waitingFor);
      if (waitingPlayer) {
        setCurrentTurn(waitingPlayer.id);
      }
      setLastGuess(lastGuess);
      setGameMessage(`${guesser} guessed ${guess}! Your turn to give clue and guess.`);
      setTimeout(() => setGameMessage(''), 4000);
    });
    
    newSocket.on('clue-and-guess-result', ({ responder, clue, guess, nextGuesser, guesses, lastGuess }) => {
      console.log('💡 Clue result:', responder, clue, guess);
      const nextPlayer = players.find(p => p.name === nextGuesser);
      if (nextPlayer) {
        setCurrentTurn(nextPlayer.id);
      }
      setPhase('clueAndGuess');
      setGuesses(guesses);
      setLastGuess(lastGuess);
      setGameMessage(`${responder} gave clue: ${clue}. Your turn!`);
      setTimeout(() => setGameMessage(''), 4000);
    });
    
    newSocket.on('game-over', ({ winner, correctNumber }) => {
      console.log('🏆 GAME OVER!', winner);
      setWinner({ name: winner, correctNumber });
    });
    
    newSocket.on('error', (msg) => {
      console.log('⚠️ Error:', msg);
      setError(msg);
      setTimeout(() => setError(''), 4000);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, [players]);

  const handleSetName = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
    }
  };

  const handleCreateGame = () => {
    if (playerName && socket) {
      console.log('Creating game for:', playerName);
      socket.emit('create-game', playerName);
    }
  };

  const handleJoinGame = () => {
    if (playerName && socket && joinRoomInput) {
      const cleanRoomId = joinRoomInput.replace(/\D/g, '');
      if (cleanRoomId.length === 6) {
        console.log('Joining game:', cleanRoomId);
        socket.emit('join-game', { roomId: cleanRoomId, playerName });
      } else {
        setError('Please enter a valid 6-digit room code');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleSetNumber = () => {
    if (socket && roomId && numberInput) {
      const num = parseInt(numberInput);
      if (num >= 0 && num <= 100) {
        console.log('Setting number:', num);
        socket.emit('set-number', { roomId, number: num });
      } else {
        setError('Number must be between 0 and 100');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleMakeGuess = () => {
    if (socket && roomId && guessInput) {
      const guess = parseInt(guessInput);
      if (guess >= 0 && guess <= 100) {
        console.log('Making guess:', guess);
        socket.emit('make-guess', { roomId, guess });
        setGuessInput('');
      } else {
        setError('Guess must be between 0 and 100');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleClueAndGuess = () => {
    if (socket && roomId && clueInput && clueGuessInput) {
      const guess = parseInt(clueGuessInput);
      if (guess >= 0 && guess <= 100) {
        console.log('Clue and guess:', clueInput, guess);
        socket.emit('clue-and-guess', { roomId, clue: clueInput, guess });
        setClueInput('');
        setClueGuessInput('');
      } else {
        setError('Guess must be between 0 and 100');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const currentPlayer = players.find(p => p.id === playerId);
  const opponent = players.find(p => p.id !== playerId);
  const bothReady = players.length === 2 && players.every(p => p.ready);
  const isMyTurn = currentTurn === playerId;
  const isGuessPhase = phase === 'guess' && isMyTurn;
  const isCluePhase = phase === 'clueAndGuess' && isMyTurn;

  // Connection failed screen
  if (connectionStatus === 'failed') {
    return (
      <div className="container">
        <h1>🎮 Number Guessing Game</h1>
        <div className="card">
          <h2>❌ Cannot connect to server</h2>
          <p>Please check your internet connection.</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>Server: {SERVER_URL}</p>
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
            onChange={(e) => setJoinRoomInput(e.target.value.replace(/\D/g, ''))}
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
        {error && <div className="error">{error}</div>}
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
            <div>
              <p>⏳ Waiting for opponent to set their number...</p>
              <div className="loader"></div>
            </div>
          ) : null}
          {bothReady && <p>🎮 Game starting...</p>}
        </div>
      </div>
    );
  }

  // Winner Screen
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

  // Main Game Board
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
          <div className="waiting">
            <div className="loader"></div>
            <p>Waiting for {opponent?.name}...</p>
          </div>
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