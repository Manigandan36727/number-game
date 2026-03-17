import React from 'react';

function NumericKeyboard({ onKeyPress, onDelete, onSubmit, visible }) {
  if (!visible) return null;

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
      padding: '20px',
      background: '#f0f0f0',
      borderRadius: '20px',
      marginTop: '20px'
    }}>
      {keys.map(key => (
        <button
          key={key}
          onClick={() => onKeyPress(key)}
          style={{
            padding: '20px',
            fontSize: '1.8rem',
            background: 'white',
            border: '2px solid #ddd',
            borderRadius: '15px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {key}
        </button>
      ))}
      <button
        onClick={onDelete}
        style={{
          padding: '20px',
          fontSize: '1.5rem',
          background: '#ff4444',
          color: 'white',
          border: 'none',
          borderRadius: '15px',
          cursor: 'pointer',
          gridColumn: 'span 2'
        }}
      >
        ⌫ DELETE
      </button>
      <button
        onClick={onSubmit}
        style={{
          padding: '20px',
          fontSize: '1.5rem',
          background: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '15px',
          cursor: 'pointer'
        }}
      >
        OK
      </button>
    </div>
  );
}

export default NumericKeyboard;