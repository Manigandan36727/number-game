import React, { useState } from 'react';

function GameBoard({ gameState, playerId, onMakeGuess, onClueAndGuess, lastGuess, autoClue, onReset }) {
  const [guess, setGuess] = useState('');
  const [clue, setClue] = useState('');
  const [clueGuess, setClueGuess] = useState('');

  const { players, currentTurn, phase, winner, guesses } = gameState;
  const currentPlayer = players.find(p => p.id === playerId);
  const opponent = players.find(p => p.id !== playerId);
  const isMyTurn = currentTurn === playerId;
  const isGuessPhase = phase === 'guess' && isMyTurn;
  const isCluePhase = phase === 'clueAndGuess' && isMyTurn;

  if (winner) {
    const isWinner = winner.name === currentPlayer?.name;
    return (
      <div className="game-board">
        <div className="card">
          <h2>Game Over!</h2>
          {isWinner ? <h1>YOU WIN!</h1> : <h1>{winner.name} wins!</h1>}
          <p>The correct number was: {winner.correctNumber}</p>
          <button onClick={onReset}>PLAY AGAIN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-board">
      <div className="game-header">
        <div className="turn-indicator">
          {isGuessPhase && <span>YOUR TURN TO GUESS!</span>}
          {isCluePhase && <span>YOUR TURN TO GIVE CLUE AND GUESS!</span>}
          {!isMyTurn && <span>Waiting for {opponent?.name}...</span>}
        </div>
        
        <div className="players-info">
          <span>You: {currentPlayer?.name}</span>
          <span>VS</span>
          <span>Opponent: {opponent?.name}</span>
        </div>
      </div>

      <div className="game-main">
        {isGuessPhase ? (
          <div>
            <h3>Guess {opponent?.name}'s Number</h3>
            <input type="number" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Enter your guess" />
            <button onClick={() => { onMakeGuess(guess); setGuess(''); }}>SUBMIT GUESS</button>
          </div>
        ) : isCluePhase ? (
          <div>
            <h3>Give a Clue About YOUR Number</h3>
            <p>{opponent?.name} guessed: {lastGuess?.guessValue}</p>
            <button onClick={() => setClue('above')}>ABOVE</button>
            <button onClick={() => setClue('below')}>BELOW</button>
            
            <h3>Now Guess {opponent?.name}'s Number</h3>
            <input type="number" value={clueGuess} onChange={(e) => setClueGuess(e.target.value)} placeholder="Enter your guess" />
            <button onClick={() => { onClueAndGuess(clue, clueGuess); setClue(''); setClueGuess(''); }}>SUBMIT CLUE & GUESS</button>
          </div>
        ) : (
          <div>Waiting for {opponent?.name}...</div>
        )}

        <div className="guesses-history">
          <h3>Game History</h3>
          {guesses.length === 0 ? <p>No moves yet</p> : guesses.map((g, i) => (
            <div key={i}>{g.guesser} guessed {g.guess} → {g.responder} said: {g.clueGiven}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GameBoard;