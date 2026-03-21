import React, { useState } from 'react';

function GameBoard({ gameState, playerId, onMakeGuess, gameMessage, lastGuess, onReset }) {
  const [guess, setGuess] = useState('');

  const { players, currentTurn, winner, guesses } = gameState;
  const currentPlayer = players.find(p => p.id === playerId);
  const opponent = players.find(p => p.id !== playerId);
  const isMyTurn = currentTurn === playerId;

  const handleSubmitGuess = () => {
    if (guess && isMyTurn) {
      onMakeGuess(guess);
      setGuess('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && guess && isMyTurn) {
      handleSubmitGuess();
    }
  };

  if (winner) {
    const isWinner = winner.name === currentPlayer?.name;
    return (
      <div className="game-board">
        <div className="card game-over">
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎮 Game Over!</h2>
          <div className="winner-announcement">
            {isWinner ? (
              <h1 className="winner-text">🎉 YOU WIN! 🎉</h1>
            ) : (
              <h1 className="loser-text">{winner.name} wins!</h1>
            )}
          </div>
          <p className="correct-number">
            The correct number was: <strong>{winner.correctNumber}</strong>
          </p>
          <button 
            className="primary-btn" 
            onClick={onReset}
            style={{ fontSize: '1.5rem', padding: '1.5rem' }}
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-board">
      <div className="game-header">
        <div className="turn-indicator">
          {isMyTurn ? (
            <span className="your-turn">✨ YOUR TURN TO GUESS! ✨</span>
          ) : (
            <span className="opponent-turn">⏳ Waiting for {opponent?.name} to guess...</span>
          )}
        </div>
        
        {gameMessage && (
          <div style={{ 
            background: '#e3f2fd', 
            padding: '12px', 
            borderRadius: '10px', 
            marginTop: '10px',
            fontSize: '1rem'
          }}>
            💬 {gameMessage}
          </div>
        )}
        
        {lastGuess && lastGuess.guesser !== currentPlayer?.name && (
          <div style={{ 
            background: '#fff3e0', 
            padding: '12px', 
            borderRadius: '10px', 
            marginTop: '10px',
            borderLeft: '4px solid #ff9800'
          }}>
            🔍 {lastGuess.guesser} guessed <strong>{lastGuess.guess}</strong> → 
            <strong style={{ color: lastGuess.clue === 'above' ? '#4caf50' : '#f44336', marginLeft: '5px' }}>
              {lastGuess.clue === 'above' ? '⬆️ ABOVE' : '⬇️ BELOW'}
            </strong>
          </div>
        )}
        
        <div className="players-info">
          <div className={'player-badge ' + (isMyTurn ? 'active' : '')}>
            <strong>You:</strong> {currentPlayer?.name}
          </div>
          <div className="vs">VS</div>
          <div className={'player-badge ' + (!isMyTurn ? 'active' : '')}>
            <strong>Opponent:</strong> {opponent?.name}
          </div>
        </div>
      </div>

      <div className="game-main">
        <div className="guess-section">
          <h3>🎯 Guess {opponent?.name}'s Number</h3>
          <p className="hint">Enter a number between 0-100</p>
          
          <div className="guess-input">
            <input
              type="number"
              min="0"
              max="100"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="ENTER YOUR GUESS"
              disabled={!isMyTurn}
              autoFocus
              style={{
                fontSize: '2.5rem',
                padding: '1.5rem',
                textAlign: 'center',
                fontWeight: 'bold',
                width: '100%',
                borderRadius: '15px',
                border: '3px solid #e0e0e0'
              }}
            />
          </div>

          <button
            className="primary-btn guess-btn"
            onClick={handleSubmitGuess}
            disabled={!isMyTurn || !guess}
            style={{
              fontSize: '1.5rem',
              padding: '1.5rem',
              marginTop: '1.5rem',
              width: '100%'
            }}
          >
            SUBMIT GUESS
          </button>
          
          <p className="hint" style={{ marginTop: '1rem', color: '#666' }}>
            After you guess, the system will automatically show if the number is ABOVE or BELOW
          </p>
        </div>

        <div className="guesses-history">
          <h3>📜 Guess History</h3>
          {guesses.length === 0 ? (
            <p className="no-guesses">No guesses yet</p>
          ) : (
            <div className="guesses-list">
              {guesses.map((g, index) => (
                <div key={index} className="guess-item">
                  <span className="guesser">{g.player}:</span>
                  <span className="guess-number">Guessed {g.guess}</span>
                  <span className={`clue-display ${g.clue}`}>
                    {g.clue === 'above' ? '⬆️ ABOVE' : '⬇️ BELOW'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameBoard;