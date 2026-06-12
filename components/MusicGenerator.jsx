'use client';
import React, { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { onnxGenerator } from '../lib/onnxGenerator';

const MusicGenerator = ({ onGenerateComplete, onGenerating }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [numNotes, setNumNotes] = useState(250);
  const [temperature, setTemperature] = useState(0.8);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    onGenerating(true);
    setError(null);
    setProgress(0);

    try {
      // 1. Run the local ONNX PyTorch model
      const midiUrl = await onnxGenerator.generate(
        numNotes * 4, // 4 tokens per note (Wait, Pitch, Dur, Vel)
        temperature,
        (p) => setProgress(Math.round(p * 100))
      );

      // 2. Return URL to parent
      onGenerateComplete({
        url: midiUrl,
        filename: `chopin_transformer_${Math.floor(Math.random()*10000)}.mid`
      });

    } catch (err) {
      console.error(err);
      setError(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
      onGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div className="control-panel-card relative overflow-hidden bg-gray-900/40 border border-purple-500/20 p-6 rounded-2xl backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none" />
      
      <div className="control-group mb-6 relative z-10">
        <div className="flex justify-between items-center mb-3">
          <label htmlFor="notes-length" className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Sequence Length</label>
          <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
            {numNotes} Notes
          </span>
        </div>
        <input 
          id="notes-length"
          type="range" 
          min="50" 
          max="500" 
          value={numNotes} 
          onChange={(e) => setNumNotes(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>

      <div className="control-group mb-8 relative z-10">
        <div className="flex justify-between items-center mb-3">
          <label htmlFor="temperature" className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Creativity</label>
          <span className="text-xs font-mono bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full border border-pink-500/30">
            {temperature.toFixed(2)}
          </span>
        </div>
        <input 
          id="temperature"
          type="range" 
          min="0.1" 
          max="2.0" 
          step="0.05"
          value={temperature} 
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
        />
      </div>

      <button 
        className="w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg shadow-purple-500/20 
                   bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500
                   transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative z-10"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        <div className="flex items-center justify-center gap-3">
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Computing... {progress}%</span>
            </>
          ) : (
            <>
              <Play size={20} className="fill-current" />
              <span>Generate Composition</span>
            </>
          )}
        </div>
      </button>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono relative z-10">
          {error}
        </div>
      )}
    </div>
  );
};

export default MusicGenerator;
