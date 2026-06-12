'use client';
import React, { useState } from 'react';
import MusicGenerator from '../../components/MusicGenerator';
import PianotifyPlayer from '../../components/PianotifyPlayer';
import SongHistory from '../../components/SongHistory';
import { Sparkles, Music } from 'lucide-react';

export default function Home() {
  const [midiData, setMidiData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);

  const handleGenerateComplete = (data) => {
    setMidiData(data);
    if (data) {
      setHistory(prev => [data, ...prev]);
    }
  };

  return (
    <div className="studio-layout">
      {/* LEFT SIDEBAR - Controls */}
      <aside className="sidebar">
        <header className="brand-header">
          <div className="logo-container">
            <img src="/favicon.svg" alt="AI Maestro Logo" className="logo-icon" />
          </div>
          <div>
            <h1>AI Maestro</h1>
            <p>Neural Symphony Engine</p>
          </div>
        </header>
        
        <div className="sidebar-content">
          <div className="control-section-title">
            <Music size={18} /> Generation Controls
          </div>
          <MusicGenerator 
            onGenerateComplete={handleGenerateComplete} 
            onGenerating={(status) => setIsGenerating(status)} 
          />
          
          <SongHistory 
            history={history} 
            currentUrl={midiData?.url} 
            onSelect={(song) => setMidiData(song)} 
          />
        </div>

        <footer className="sidebar-footer">
          &copy; 2026 AI Studio by Yahya el gzouli
        </footer>
      </aside>

      {/* RIGHT MAIN STAGE - Visualizer */}
      <main className="main-stage">
        {midiData ? (
          <PianotifyPlayer midiUrl={midiData.url} filename={midiData.filename} />
        ) : (
          <div className="empty-stage">
            {isGenerating ? (
              <div className="loading-stage">
                <div className="sound-waves large">
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                </div>
                <h2>Composing Masterpiece...</h2>
                <p>The AI is calculating thousands of neural connections to write your song.</p>
              </div>
            ) : (
              <div className="idle-stage">
                <Music size={64} className="idle-icon" />
                <h2>Studio Ready</h2>
                <p>Adjust the sequence length and click Generate to start the AI composer.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
