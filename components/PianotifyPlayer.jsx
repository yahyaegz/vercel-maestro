'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Midi } from '@tonejs/midi';
import 'html-midi-player';
import PianoKeyboard from './PianoKeyboard';

const getNotePosition = (midi) => {
  let currentMidi = 21;
  for (let i = 0; i < 52; i++) {
    const isBlackAfter = [0, 2, 3, 5, 6].includes(i % 7) && i < 51;
    if (midi === currentMidi) return { type: 'white', x: i / 52, w: 1 / 52 };
    if (isBlackAfter && midi === currentMidi + 1) return { type: 'black', x: (i + 0.65) / 52, w: 0.7 / 52 };
    currentMidi += isBlackAfter ? 2 : 1;
  }
  return null;
};

const PianotifyPlayer = ({ midiUrl, filename }) => {
  const playerRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [midiData, setMidiData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadMidi = async () => {
      try {
        const response = await fetch(midiUrl);
        const arrayBuffer = await response.arrayBuffer();
        const parsedMidi = new Midi(arrayBuffer);
        
        if (isMounted) {
          const allNotes = [];
          parsedMidi.tracks.forEach(track => {
            track.notes.forEach(note => {
              allNotes.push({
                midi: note.midi,
                time: note.time,
                duration: note.duration,
                pos: getNotePosition(note.midi)
              });
            });
          });
          
          allNotes.sort((a, b) => a.time - b.time);
          setMidiData(allNotes);
        }
      } catch (err) {
        console.error("Failed to parse MIDI:", err);
      }
    };
    loadMidi();
    return () => { isMounted = false; };
  }, [midiUrl]);

  useEffect(() => {
    if (!midiData || !canvasRef.current || !playerRef.current || !containerRef.current) return;

    let animationId;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false }); 
    
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
      }
    });
    resizeObserver.observe(containerRef.current);

    let previousActive = new Set();
    let windowStartIndex = 0;
    
    let visualTime = 0;
    let lastSysTime = performance.now();

    const renderLoop = (sysTime) => {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const deltaMs = sysTime - lastSysTime;
      lastSysTime = sysTime;

      const player = playerRef.current;
      const actualTime = player ? player.currentTime || 0 : 0;
      
      const isPlaying = player && (player.playing || (player.hasAttribute && player.hasAttribute('playing')));

      if (isPlaying) {
        // Prevent massive teleportation jumps ("cuts") if the browser drops a frame
        const cappedDelta = Math.min(deltaMs, 30); 
        
        let timeDiff = actualTime - visualTime;
        
        // Hard snap ONLY on massive user timeline scrubs (> 1.5 seconds)
        if (Math.abs(timeDiff) > 1.5) {
          visualTime = actualTime; 
        } else {
          // PID Time Controller: Smoothly bend time to stay in sync with audio
          // This absorbs choppy audio clock polling and dropped frames flawlessly.
          // If visual is behind audio, speed up. If ahead, slow down.
          let speed = 1.0 + (timeDiff * 5.0); 
          
          // Clamp speed to prevent jarring visual acceleration
          speed = Math.max(0.7, Math.min(1.3, speed));
          
          visualTime += (cappedDelta / 1000) * speed;
        }
      } else {
        visualTime = actualTime; 
      }

      // INCREASED SPEED: Absolute maximum speed (1500 pixels per second)
      const PIXELS_PER_SECOND = 1500; 
      const currentActive = new Set();

      const VISIBLE_SECONDS = canvas.height / PIXELS_PER_SECOND;
      const MAX_NOTE_DURATION = 10; 
      const earliestVisibleTime = visualTime - VISIBLE_SECONDS - MAX_NOTE_DURATION;
      const latestVisibleTime = visualTime + VISIBLE_SECONDS + 2;

      // Bidirectional Sliding Window: Allow the window to slide backwards if the user scrubs the timeline
      while (windowStartIndex > 0 && midiData[windowStartIndex - 1].time >= earliestVisibleTime) {
        windowStartIndex--;
      }

      while (windowStartIndex < midiData.length && midiData[windowStartIndex].time < earliestVisibleTime) {
        windowStartIndex++;
      }

      const getMidiColor = (midi) => {
        if (midi < 45) return '#3b82f6'; // Deep Blue for Bass
        if (midi > 75) return '#ec4899'; // Hot Pink for Treble
        return '#4ade80'; // Neon Green for Mid-range
      };

      const getDarkColor = (midi) => {
        if (midi < 45) return '#1e3a8a';
        if (midi > 75) return '#831843';
        return '#14532d';
      };

      for (let i = windowStartIndex; i < midiData.length; i++) {
        const note = midiData[i];
        
        if (note.time > latestVisibleTime) break;
        if (!note.pos) continue;

        const hitTime = note.time;
        const releaseTime = note.time + note.duration;
        
        const isActive = visualTime >= hitTime && visualTime <= releaseTime;
        if (isActive) {
          currentActive.add(note.midi);
        }

        const KEYBOARD_HEIGHT = 100; // Matches CSS height of the white keys
        const hitLine = canvas.height - KEYBOARD_HEIGHT;

        const bottomDist = (hitTime - visualTime) * PIXELS_PER_SECOND;
        const noteHeight = note.duration * PIXELS_PER_SECOND;
        const y = hitLine - bottomDist - noteHeight;
        
        // Only skip if the note is completely off the bottom of the canvas (not just the hitline)
        if (y > canvas.height || y + noteHeight < 0) continue;

        const x = note.pos.x * canvas.width;
        const w = note.pos.w * canvas.width;

        const baseColor = getMidiColor(note.midi);
        const darkColor = getDarkColor(note.midi);

        // BULLETPROOF 3D GLASS VISUALS (0 Memory Allocation)
        // We simulate a 3D glass cylinder and neon blurs using fast, layered fillRects.
        if (isActive) {
          // Multi-layered fake Gaussian glow
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = baseColor;
          ctx.fillRect(x - 8, y - 8, w + 16, noteHeight + 16);
          ctx.globalAlpha = 0.5;
          ctx.fillRect(x - 3, y - 3, w + 6, noteHeight + 6);
          ctx.globalAlpha = 1.0;
        }
        
        // 1. Dark Base (Acts as a 3D bevel/shadow edge)
        ctx.fillStyle = note.pos.type === 'black' ? '#000000' : darkColor;
        ctx.fillRect(x + 1, y, w - 2, noteHeight); 

        // 2. Vibrant Core
        ctx.fillStyle = isActive ? '#ffffff' : baseColor;
        const insetX = w * 0.15;
        ctx.fillRect(x + 1 + insetX, y, w - 2 - (insetX * 2), noteHeight);

        // 3. 3D Glass Reflection Highlight (Streak down the middle)
        if (!isActive) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          const highlightW = w * 0.15;
          ctx.fillRect(x + 1 + (w / 2) - (highlightW / 2), y, highlightW, noteHeight);
        }

        // 4. Bright Striking Cap (The bottom edge that hits the piano key)
        ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(x + 1, y + noteHeight - 6, w - 2, 6);
      }

      previousActive.forEach(midi => {
        if (!currentActive.has(midi)) {
          const el = document.getElementById(`piano-key-${midi}`);
          if (el) {
            el.classList.remove('active-white', 'active-black');
            el.style.boxShadow = '';
            el.style.color = '';
            el.style.background = '';
          }
        }
      });

      currentActive.forEach(midi => {
        if (!previousActive.has(midi)) {
          const el = document.getElementById(`piano-key-${midi}`);
          if (el) {
            const isBlack = el.classList.contains('black-key');
            el.classList.add(isBlack ? 'active-black' : 'active-white');
            const color = getMidiColor(midi);
            el.style.boxShadow = `0 0 30px ${color}, inset 0 0 20px ${color}, 0 4px 8px rgba(0,0,0,0.5)`;
            if (!isBlack) {
              el.style.color = color;
            }
          }
        }
      });

      previousActive = currentActive;
      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      previousActive.forEach(midi => {
        const el = document.getElementById(`piano-key-${midi}`);
        if (el) {
          el.classList.remove('active-white', 'active-black');
          el.style.boxShadow = '';
          el.style.color = '';
          el.style.background = '';
        }
      });
    };
  }, [midiData]);

  // Handle Audio Context cleanup on unmount!
  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && player.stop) {
        player.stop(); // Explicitly kill the audio process when the component is destroyed
      }
    };
  }, []);

  const handleRestart = () => {
    const player = playerRef.current;
    if (player) {
      // Hard reset the underlying Magenta WebAudio engine
      if (player.stop) player.stop();
      
      // Force it back to 0 (stop() should do this, but just in case)
      player.currentTime = 0;
      
      // Give the engine a tiny millisecond to clear its buffers, then start
      setTimeout(() => {
        if (player && player.start) {
          player.start();
        }
      }, 50);
    }
  };

  return (
    <div className="player-stage-container">
      <div ref={containerRef} className="waterfall-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
        <canvas 
          ref={canvasRef} 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }} 
        />
        <div style={{ marginTop: 'auto', zIndex: 10 }}>
          <PianoKeyboard />
        </div>
      </div>

      <div className="floating-controls">
        <midi-player
          ref={playerRef}
          src={midiUrl}
          sound-font="https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus"
          className="sleek-player"
        ></midi-player>

        <button 
          onClick={handleRestart}
          className="btn-download"
          title="Restart from beginning"
          style={{ cursor: 'pointer', background: 'rgba(167, 139, 250, 0.15)', borderColor: 'rgba(167, 139, 250, 0.3)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 19 2 12 11 5 11 19"></polygon>
            <polygon points="22 19 13 12 22 5 22 19"></polygon>
          </svg>
          <span>Restart</span>
        </button>

        <a 
          href={midiUrl} 
          download={filename || "generated-music.mid"}
          className="btn-download"
          title="Download MIDI"
        >
          <Download size={20} />
          <span>Save MIDI</span>
        </a>
      </div>
    </div>
  );
};

export default PianotifyPlayer;
