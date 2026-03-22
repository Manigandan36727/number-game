import React, { useState } from 'react';

function GameBoard({ gameState, playerId, onMakeGuess, onGiveClue, gameMessage, lastGuess, onReset }) {
  const [guess, setGuess] = useState('');
  const [selectedClue, setSelectedClue] = useState('');

  const { players, currentTurn, waitingForClue, winner, guesses } = gameState;
  const currentPlayer = players.find(p => p.id === playerId);
  const opponent = players.find(p => p.id !== playerId);
  const isMyTurn = currentTurn === playerId;
  const isMyTurnToGiveClue = waitingForClue && isMyTurn;
  const isMyTurnToGuess = !waitingForClue && isMyTurn;

  const handleSubmitGuess = () => {
    if (guess && isMyTurnToGuess) {
      onMakeGuess(guess);
      setGuess('');
    }
  };

  const handleSubmitClue = () => {
    if (selectedClue && isMyTurnToGiveClue) {
      onGiveClue(selectedClue);
      setSelectedClue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && guess && isMyTurnToGuess) {
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
          {isMyTurnToGuess && (
            <span className="your-turn">✨ YOUR TURN TO GUESS! ✨</span>
          )}
          {isMyTurnToGiveClue && (
            <span className="your-turn">📢 YOUR TURN TO GIVE CLUE! 📢</span>
          )}
          {!isMyTurn && !waitingForClue && (
            <span className="opponent-turn">⏳ Waiting for {opponent?.name} to guess...</span>
          )}
          {!isMyTurn && waitingForClue && (
            <span className="opponent-turn">⏳ Waiting for {opponent?.name} to give clue...</span>
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
        
        {lastGuess && lastGuess.guesserName !== currentPlayer?.name && !waitingForClue && (
          <div style={{ 
            background: '#fff3e0', 
            padding: '12px', 
            borderRadius: '10px', 
            marginTop: '10px',
            borderLeft: '4px solid #ff9800'
          }}>
            🔍 Previous guess: {lastGuess.guesserName} guessed <strong>{lastGuess.guessValue}</strong>
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
        {isMyTurnToGuess ? (
          // GUESS MODE
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
        ) : isMyTurnToGiveClue ? (
          // CLUE MODE
          <div className="clue-section">
            <h3>📢 Give a Clue About YOUR Number</h3>
            <p className="hint">
              {opponent?.name} guessed <strong>{lastGuess?.guessValue}</strong>
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

            <button
              className="primary-btn"
              onClick={handleSubmitClue}
              disabled={!selectedClue}
              style={{
                fontSize: '1.5rem',
                padding: '1.5rem',
                marginTop: '1.5rem',
                width: '100%'
              }}
            >
              SUBMIT CLUE
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