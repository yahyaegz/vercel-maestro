'use client';
import React from 'react';

const PianoKeyboard = () => {
  const whiteKeys = [];
  const blackKeys = [];
  let currentMidi = 21; 

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  for (let i = 0; i < 52; i++) {
    const letter = letters[i % 7];
    const isBlackAfter = [0, 2, 3, 5, 6].includes(i % 7);
    const actualBlackAfter = isBlackAfter && i < 51;

    whiteKeys.push(
      <div 
        key={`white-${i}`} 
        id={`piano-key-${currentMidi}`}
        className="key white-key"
      >
        <span className="key-label">{letter}</span>
      </div>
    );

    if (actualBlackAfter) {
      blackKeys.push(
        <div 
          key={`black-${i}`}
          id={`piano-key-${currentMidi + 1}`}
          className="key black-key"
          style={{ 
            left: `${(i + 0.65) * (100 / 52)}%`, 
            width: `${0.7 * (100 / 52)}%` 
          }}
        ></div>
      );
    }
    
    currentMidi += actualBlackAfter ? 2 : 1;
  }

  return (
    <div className="piano-keyboard-container">
      <div className="piano-keyboard" style={{ position: 'relative' }}>
        <div className="white-keys-layer" style={{ display: 'flex', width: '100%', height: '100%' }}>
          {whiteKeys}
        </div>
        <div className="black-keys-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {blackKeys}
        </div>
      </div>
      <div className="piano-base"></div>
    </div>
  );
};

export default PianoKeyboard;
