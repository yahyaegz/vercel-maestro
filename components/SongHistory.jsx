'use client';
import React from 'react';
import { Clock, Play, Download } from 'lucide-react';

const SongHistory = ({ history, currentUrl, onSelect }) => {
  if (history.length === 0) return null;

  return (
    <div className="control-panel-card" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
        <Clock size={20} className="glow-icon" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#f8f8fb' }}>Song Library</h2>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {history.map((song, idx) => {
          const isActive = song.url === currentUrl;
          
          return (
            <div 
              key={idx}
              onClick={() => onSelect(song)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: isActive ? 'rgba(134, 239, 172, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isActive ? 'rgba(134, 239, 172, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <Play size={16} color={isActive ? '#86efac' : '#888'} style={{ flexShrink: 0 }} />
                <span 
                  style={{ 
                    color: isActive ? '#86efac' : '#ccc', 
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={song.filename} // Shows full name on hover
                >
                  {song.filename.replace('chopin_transformer_', 'Composition ')}
                </span>
              </div>
              
              <a 
                href={song.url} 
                download={song.filename}
                onClick={(e) => e.stopPropagation()}
                style={{ color: '#888', cursor: 'pointer', flexShrink: 0 }}
                title="Download"
              >
                <Download size={16} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SongHistory;
