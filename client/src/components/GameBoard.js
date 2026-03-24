import React, { useState } from 'react';

function GameBoard({ gameState, playerId, onMakeGuess, onClueAndGuess, gameMessage, lastGuess, autoClue, onReset }) {
  const [guess, setGuess] = useState('');
  const [selectedClue, setSelectedClue] = useState('');
  const [clueAndGuessValue, setClueAndGuessValue] = useState('');

  const { players, currentTurn, phase, winner, guesses } = gameState;
  const currentPlayer = players.find(p => p.id === playerId);
  const opponent = players.find(p => p.id !== playerId);
  const isMyTurn = currentTurn === playerId;
  const isFirstTurnGuess = phase === 'guess' && isMyTurn;
  const isClueAndGuessTurn = phase === 'waitingForClueAndGuess' && isMyTurn;

  const handleSubmitGuess = () => {
    if (guess && isFirstTurnGuess) {
      onMakeGuess(guess);
      setGuess('');
    }
  };

  const handleSubmitClueAndGuess = () => {
    if (selectedClue && clueAndGuessValue && isClueAndGuessTurn) {
      onClueAndGuess(selectedClue, clueAndGuessValue);
      setSelectedClue('');
      setClueAndGuessValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && guess && isFirstTurnGuess) {
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
          {isFirstTurnGuess && (
            <span className="your-turn">✨ YOUR TURN TO GUESS! ✨</span>
          )}
          {isClueAndGuessTurn && (
            <span className="your-turn">📢 GIVE CLUE + GUESS! 📢</span>
          )}
          {!isMyTurn && (
            <span className="opponent-turn">⏳ Waiting for {opponent?.name}...</span>
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
        
        {autoClue && !isMyTurn && (
          <div style={{ 
            background: '#e8f5e8', 
            padding: '12px', 
            borderRadius: '10px', 
            marginTop: '10px',
            borderLeft: '4px solid #4caf50'
          }}>
            🔍 System clue: The number is <strong>{autoClue.toUpperCase()}</strong> the last guess
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
        {isFirstTurnGuess ? (
          // FIRST TURN - ONLY GUESS
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
              disabled={!guess}
              style={{
                fontSize: '1.5rem',
                padding: '1.5rem',
                marginTop: '1.5rem',
                width: '100%'
              }}
            >
              SUBMIT GUESS
            </button>
          </div>
        ) : isClueAndGuessTurn ? (
          // SUBSEQUENT TURNS - CLUE + GUESS
          <div className="clue-and-guess-section">
            <h3>📢 Give Clue & Guess {opponent?.name}'s Number</h3>
            
            <div className="clue-section">
              <p className="hint">
                {opponent?.name} last guessed <strong>{lastGuess?.guessValue}</strong>
              </p>
              <p className="hint">
                Is YOUR number <strong>ABOVE</strong> or <strong>BELOW</strong> {lastGuess?.guessValue}?
              </p>
              
              <div className="comparison-buttons">
                <button
                  className={'comparison-btn ' + (selectedClue === 'above' ? 'selected' : '')}
                  onClick={() => setSelectedClue('above')}
                  style={{
                    flex: 1,
                    padding: '1.5rem',
                    fontSize: '1.4rem',
                    fontWeight: 'bold'
                  }}
                >
                  ⬆️ ABOVE
                </button>
                <button
                  className={'comparison-btn ' + (selectedClue === 'below' ? 'selected' : '')}
                  onClick={() => setSelectedClue('below')}
                  style={{
                    flex: 1,
                    padding: '1.5rem',
                    fontSize: '1.4rem',
                    fontWeight: 'bold'
                  }}
                >
                  ⬇️ BELOW
                </button>
              </div>
            </div>

            <div className="guess-section" style={{ marginTop: '2rem' }}>
              <h3>🎯 Now Guess {opponent?.name}'s Number</h3>
              <p className="hint">Enter a number between 0-100</p>
              
              <div className="guess-input">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={clueAndGuessValue}
                  onChange={(e) => setClueAndGuessValue(e.target.value)}
                  placeholder="ENTER YOUR GUESS"
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
            </div>

            <button
              className="primary-btn"
              onClick={handleSubmitClueAndGuess}
              disabled={!selectedClue || !clueAndGuessValue}
              style={{
                fontSize: '1.5rem',
                padding: '1.5rem',
                marginTop: '1.5rem',
                width: '100%'
              }}
            >
              SUBMIT CLUE & GUESS
            </button>
          </div>
        ) : (
          // WAITING MODE
          <div className="waiting-section">
            <div className="loader"></div>
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '1.2rem', color: '#666' }}>
              Waiting for {opponent?.name}...
            </p>
          </div>
        )}

        <div className="guesses-history">
          <h3>📜 Game History</h3>
          {guesses.length === 0 ? (
            <p className="no-guesses">No moves yet</p>
          ) : (
            <div className="guesses-list">
              {guesses.map((g, index) => (
                <div key={index} className="guess-item">
                  <span className="guesser">{g.guesser}:</span>
                  <span className="guess-number">Guessed {g.guess}</span>
                  <span className={`clue-display ${g.clueGiven}`}>
                    {g.responder} said: {g.clueGiven === 'above' ? '⬆️ ABOVE' : '⬇️ BELOW'}
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