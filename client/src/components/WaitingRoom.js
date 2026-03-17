import React, { useState } from 'react';

function WaitingRoom({ playerName, onCreateGame, onJoinGame }) {
  const [roomIdInput, setRoomIdInput] = useState('');

  const handleRoomIdChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setRoomIdInput(value);
  };

  return (
    <div className="waiting-room">
      <div className="card">
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Welcome, {playerName}!</h2>
        
        <div className="section">
          <h3>🎮 Create New Game</h3>
          <button className="primary-btn" onClick={onCreateGame}>
            CREATE GAME ROOM
          </button>
        </div>

        <div className="divider">OR</div>

        <div className="section">
          <h3>🔢 Join Existing Game</h3>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="ENTER 6-DIGIT CODE"
            value={roomIdInput}
            onChange={handleRoomIdChange}
            maxLength="6"
            style={{
              fontSize: '2rem',
              padding: '1.5rem',
              textAlign: 'center',
              letterSpacing: '5px',
              fontWeight: 'bold'
            }}
          />
          <button 
            className="primary-btn"
            onClick={() => onJoinGame(roomIdInput)}
            disabled={roomIdInput.length !== 6}
            style={{
              opacity: roomIdInput.length === 6 ? 1 : 0.5
            }}
          >
            JOIN GAME
          </button>
          {roomIdInput.length > 0 && roomIdInput.length < 6 && (
            <p style={{ color: '#f44336', marginTop: '1rem', fontSize: '1.1rem' }}>
              Need {6 - roomIdInput.length} more number{6 - roomIdInput.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default WaitingRoom;