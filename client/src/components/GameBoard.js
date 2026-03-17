import React, { useState } from 'react';

function GameBoard({ gameState, playerId, onMakeGuess, onReset }) {
  const [guess, setGuess] = useState('');
  const [comparison, setComparison] = useState('');

  const { players, currentTurn, winner, guesses } = gameState;
  const currentPlayer = players.find(p => p.id === playerId);
  const opponent = players.find(p => p.id !== playerId);
  const isMyTurn = currentTurn === playerId;

  const handleSubmitGuess = () => {
    if (guess && comparison) {
      onMakeGuess(guess, comparison);
      setGuess('');
      setComparison('');
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
            <span className="your-turn">✨ YOUR TURN! ✨</span>
          ) : (
            <span className="opponent-turn">⏳ Waiting for {opponent?.name}...</span>
          )}
        </div>
        
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
          <h3>🎯 Make Your Guess</h3>
          <p className="hint">Guess the opponent's number (0-100)</p>
          
          <div className="guess-input">
            <input
              type="number"
              min="0"
              max="100"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="ENTER YOUR GUESS"
              disabled={!isMyTurn}
              style={{
                fontSize: '2.5rem',
                padding: '1.5rem',
                textAlign: 'center',
                fontWeight: 'bold'
              }}
            />
          </div>

          <div className="comparison-buttons">
            <button
              className={'comparison-btn ' + (comparison === 'above' ? 'selected' : '')}
              onClick={() => setComparison('above')}
              disabled={!isMyTurn || !guess}
            >
              ⬆️ ABOVE
            </button>
            <button
              className={'comparison-btn ' + (comparison === 'below' ? 'selected' : '')}
              onClick={() => setComparison('below')}
              disabled={!isMyTurn || !guess}
            >
              ⬇️ BELOW
            </button>
          </div>

          <button
            className="primary-btn guess-btn"
            onClick={handleSubmitGuess}
            disabled={!isMyTurn || !guess || !comparison}
            style={{
              fontSize: '1.5rem',
              padding: '1.5rem'
            }}
          >
            SUBMIT GUESS
          </button>
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
                  <span className="guess-number">{g.guess}</span>
                  <span className={'comparison ' + g.comparison}>
                    {g.comparison === 'above' ? '⬆️' : '⬇️'}
                  </span>
                  <span className={'result ' + (g.result.includes('correct') ? 'correct' : 'wrong')}>
                    {g.result}
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