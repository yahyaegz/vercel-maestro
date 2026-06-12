'use client';
import React, { useState, useEffect } from 'react';
import { Play, Loader2 } from 'lucide-react';

const MusicGenerator = ({ onGenerateComplete, onGenerating }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [numNotes, setNumNotes] = useState(250);
  const [temperature, setTemperature] = useState(0.8);
  const [error, setError] = useState(null);
  const [model, setModel] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);

  useEffect(() => {
    // Initialize the Magenta MusicRNN model
    const initializeModel = async () => {
      try {
        const rnn = new window.mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
        await rnn.initialize();
        setModel(rnn);
        setIsModelLoading(false);
      } catch (err) {
        setError('Failed to load AI weights.');
        setIsModelLoading(false);
      }
    };
    initializeModel();
  }, []);

  const handleGenerate = async () => {
    if (!model) return;
    
    setIsGenerating(true);
    onGenerating(true);
    setError(null);
    onGenerateComplete(null);

    try {
      // Create a starting seed (Middle C)
      const seedSequence = {
        notes: [
          { pitch: 60, startTime: 0.0, endTime: 0.5, velocity: 80 }
        ],
        totalTime: 0.5
      };

      // Quantize sequence to 4 steps per quarter note
      const qns = window.mm.sequences.quantizeNoteSequence(seedSequence, 4);
      
      // Generate continuation
      const result = await model.continueSequence(qns, numNotes, temperature);
      
      // Unquantize and combine
      const unquantized = window.mm.sequences.unquantizeSequence(result);
      const combined = window.mm.sequences.concatenate([seedSequence, unquantized]);

      // Convert to MIDI Blob
      const midiBytes = window.mm.sequenceProtoToMidi(combined);
      const blob = new Blob([midiBytes], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      
      onGenerateComplete({
        url: url,
        filename: `AI_Compo_${Date.now()}.mid`
      });
    } catch (err) {
      setError(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
      onGenerating(false);
    }
  };

  return (
    <div className="control-panel-card">
      <div className="control-group">
        <div className="control-header">
          <label htmlFor="notes-length">Sequence Length</label>
          <span className="value-badge">{numNotes} Notes</span>
        </div>
        <input 
          id="notes-length"
          type="range" 
          min="50" 
          max="1000" 
          value={numNotes} 
          onChange={(e) => setNumNotes(parseInt(e.target.value))}
          className="range-slider"
        />
      </div>

      <div className="control-group">
        <div className="control-header">
          <label htmlFor="temperature">Creativity</label>
          <span className="value-badge">{temperature.toFixed(2)}</span>
        </div>
        <input 
          id="temperature"
          type="range" 
          min="0.1" 
          max="2.0" 
          step="0.05"
          value={temperature} 
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="range-slider"
        />
      </div>

      <button 
        className="btn-primary"
        onClick={handleGenerate}
        disabled={isGenerating || isModelLoading}
      >
        {isModelLoading ? (
          <>
            <Loader2 className="spinner" size={20} />
            Loading AI Engine...
          </>
        ) : isGenerating ? (
          <>
            <Loader2 className="spinner" size={20} />
            Computing...
          </>
        ) : (
          <>
            <Play size={20} className="play-icon" />
            Generate Composition
          </>
        )}
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default MusicGenerator;
