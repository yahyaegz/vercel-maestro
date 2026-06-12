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
            <p className="subtitle">Neural Symphony Engine</p>
          </div>
        </header>

        <section className="control-section">
          <div className="section-title">
            <Sparkles size={18} className="text-pink-500" />
            <h2>AI Composer</h2>
          </div>
          <MusicGenerator 
            onGenerateComplete={handleGenerateComplete}
            onGenerating={setIsGenerating}
          />
        </section>

        <section className="history-section mt-8">
          <div className="section-title">
            <Music size={18} className="text-blue-400" />
            <h2>Song Library</h2>
          </div>
          <SongHistory 
            history={history}
            onSelectSong={(song) => setMidiData(song)}
            currentSongUrl={midiData?.url}
          />
        </section>
      </aside>

      {/* RIGHT MAIN STAGE - Visualizer */}
      <main className="main-stage">
        {isGenerating ? (
          <div className="empty-state">
            <div className="pulse-ring"></div>
            <h3>Composing Masterpiece...</h3>
            <p>The neural network is synthesizing notes in real-time.</p>
          </div>
        ) : midiData ? (
          <PianotifyPlayer midiUrl={midiData.url} filename={midiData.filename} />
        ) : (
          <div className="empty-state">
            <div className="idle-icon">🎹</div>
            <h3>Ready to Compose</h3>
            <p>Adjust the sequence length and creativity, then press Generate.</p>
          </div>
        )}
      </main>
    </div>
  );
}
