import * as ort from 'onnxruntime-web';
import MidiWriter from 'midi-writer-js';

// Ensure WASM files are loaded from CDN so Next.js doesn't fail trying to bundle them
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

export class ONNXMusicGenerator {
  constructor() {
    this.session = null;
    this.vocab = null;
    this.intToToken = {};
  }

  async initialize() {
    if (this.session) return;
    
    // Load vocab
    const response = await fetch('/vocab.json');
    this.vocab = await response.json();
    this.vocab.forEach((t, i) => {
      this.intToToken[i] = t;
    });

    // Load ONNX Model
    this.session = await ort.InferenceSession.create('/music_transformer.onnx', {
      executionProviders: ['wasm']
    });
  }

  generateSquareSubsequentMask(sz) {
    const mask = new Float32Array(sz * sz);
    for (let i = 0; i < sz; i++) {
      for (let j = 0; j < sz; j++) {
        if (j > i) {
          mask[i * sz + j] = -Infinity;
        } else {
          mask[i * sz + j] = 0.0;
        }
      }
    }
    return new ort.Tensor('float32', mask, [sz, sz]);
  }

  softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
  }

  topK(logits, k, temperature) {
    // Apply temperature
    const scaled = logits.map(x => x / Math.max(temperature, 0.01));
    
    // Get indices and sort
    const indices = Array.from({ length: scaled.length }, (_, i) => i);
    indices.sort((a, b) => scaled[b] - scaled[a]);
    
    // Take top k
    const topIndices = indices.slice(0, k);
    const topLogits = topIndices.map(i => scaled[i]);
    
    // Softmax over top k
    const probs = this.softmax(topLogits);
    
    // Multinomial sample
    const r = Math.random();
    let cumulative = 0.0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (r <= cumulative) {
        return topIndices[i];
      }
    }
    return topIndices[topIndices.length - 1];
  }

  async generate(numTokens = 200, temperature = 0.8, onProgress = null) {
    await this.initialize();

    // Initial seed: A basic C-major arpeggio sequence to kickstart the transformer
    // In our vocabulary: Pitch_60, Pitch_64, Pitch_67 etc. 
    // We'll dynamically look up some valid tokens.
    let pattern = [];
    const seedPitches = [60, 64, 67, 72];
    for (let p of seedPitches) {
      const idx = Object.keys(this.intToToken).find(k => this.intToToken[k] === `Pitch_${p}`);
      if (idx) pattern.push(parseInt(idx));
    }
    if (pattern.length === 0) pattern = [0, 1, 2, 3]; // fallback
    
    const generatedIndices = [];
    
    for (let i = 0; i < numTokens; i++) {
      const seqLen = pattern.length;
      
      const srcTensor = new ort.Tensor('int64', new BigInt64Array(pattern.map(BigInt)), [1, seqLen]);
      const srcMaskTensor = this.generateSquareSubsequentMask(seqLen);
      
      const feeds = { src: srcTensor, src_mask: srcMaskTensor };
      const results = await this.session.run(feeds);
      
      const outputTensor = results.output;
      const vocabSize = this.vocab.length;
      
      const lastTokenOffset = (seqLen - 1) * vocabSize;
      const lastTokenLogits = Array.from(outputTensor.data.slice(lastTokenOffset, lastTokenOffset + vocabSize));
      
      const nextIndex = this.topK(lastTokenLogits, 10, temperature);
      
      generatedIndices.push(nextIndex);
      pattern.push(nextIndex);
      
      // Shift pattern to maintain a max context window of 100
      if (pattern.length > 100) {
        pattern.shift();
      }

      if (onProgress) {
        onProgress((i + 1) / numTokens);
      }
      
      await new Promise(r => setTimeout(r, 0)); // yield
    }

    return this.tokensToMidi(generatedIndices);
  }

  tokensToMidi(indices) {
    const track = new MidiWriter.Track();
    track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));
    
    let offset = 0.0;
    const activeNotes = [];
    let currentNote = null;
    
    for (const idx of indices) {
      const token = this.intToToken[idx];
      if (!token) continue;
      
      const parts = token.split('_');
      const type = parts[0];
      const val = parts.length > 1 ? parseFloat(parts[1]) : 0;
      
      if (type === 'Wait') {
        offset += val;
      } else if (type === 'Pitch') {
        if (currentNote) {
          activeNotes.push(currentNote);
        }
        currentNote = { pitch: Math.round(val), dur: 1.0, vel: 90, offset: offset };
      } else if (type === 'Vel' && currentNote) {
        currentNote.vel = Math.round(val);
      } else if (type === 'Dur' && currentNote) {
        currentNote.dur = val;
      }
    }
    
    if (currentNote) {
      activeNotes.push(currentNote);
    }
    
    for (const n of activeNotes) {
      // 1 beat = 1 quarter note. midi-writer defaults to 128 ticks per beat.
      const startTicks = Math.round(n.offset * 128);
      const durTicks = Math.round(n.dur * 128);
      
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [n.pitch],
        duration: 'T' + durTicks,
        tick: startTicks,
        velocity: n.vel
      }));
    }
    
    const write = new MidiWriter.Writer(track);
    const uint8Array = write.buildFile();
    const blob = new Blob([uint8Array], { type: 'audio/midi' });
    return URL.createObjectURL(blob);
  }
}

export const onnxGenerator = new ONNXMusicGenerator();
