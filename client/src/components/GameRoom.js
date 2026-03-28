import React, { useState } from 'react';

function GameRoom({ roomId, players, playerId, onSetNumber }) {
  const [number, setNumber] = useState('');
  const [isSet, setIsSet] = useState(false);

  const currentPlayer = players.find(p => p.id === playerId);
  const opponent = players.find(p => p.id !== playerId);

  const handleSetNumber = () => {
    const num = parseInt(number);
    if (number && num >= 0 && num <= 100) {
     console.log('Setting number:', num);
      onSetNumber(num);
      setIsSet(true);
    }
  };

  const formattedRoomId = roomId.replace(/(\d{3})(\d{3})/, '$1 $2');

  return (
    <div className="game-room">
      <div className="card">
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Game Room</h2>
        <div className="room-info" style={{ fontSize: '2.5rem' }}>
          {formattedRoomId}
        </div>
        <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#666' }}>
          Share this 6-digit code with your friend
        </p>

        <div className="players-status">
          <div className={'player ' + (currentPlayer?.ready ? 'ready' : '')}>
            <h4>👤 You: {currentPlayer?.name}</h4>
            <p>{currentPlayer?.ready ? '✅ Number set' : '⏳ Set your number...'}</p>
          </div>

          {opponent && (
            <div className={'player ' + (opponent?.ready ? 'ready' : '')}>
              <h4>👥 Opponent: {opponent?.name}</h4>
              <p>{opponent?.ready ? '✅ Number set' : '⏳ Setting number...'}</p>
            </div>
          )}
        </div>

        {!isSet && (
          <div className="number-set-section">
            <h3>🎯 Set Your Secret Number</h3>
            <p className="hint">Choose a number between 0-100</p>
            <input
              type="number"
              min="0"
              max="100"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="ENTER NUMBER"
              style={{
                fontSize: '2.5rem',
                padding: '1.5rem',
                textAlign: 'center',
                fontWeight: 'bold'
              }}
            />
            <button 
              className="primary-btn"
              onClick={handleSetNumber}
              disabled={!number || parseInt(number) < 0 || parseInt(number) > 100}
              style={{
                fontSize: '1.5rem',
                padding: '1.5rem'
              }}
            >
              SET SECRET NUMBER
            </button>
          </div>
        )}

        {isSet && !opponent?.ready && (
          <div className="waiting-message">
            <p>⏳ Waiting for opponent...</p>
            <div className="loader"></div>
          </div>
        )}

        {isSet && opponent?.ready && (
          <div className="ready-message">
            <p>🎉 Both players ready!</p>
            <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>Game starting...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameRoom;