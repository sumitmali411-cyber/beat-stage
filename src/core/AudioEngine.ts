export class AudioEngine {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private dataArray: Uint8Array | null = null;
  private buffer: AudioBuffer | null = null;
  // MediaElement source for streaming URLs (proxy/stream)
  private mediaElement: HTMLAudioElement | null = null;
  private isStreaming = false;

  private startTime: number = 0;
  private pausedAt: number = 0;

  // Callback fired when a song finishes playing naturally
  onEnded: (() => void) | null = null;

  constructor() {}

  private initContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);
      this.analyser.connect(this.gainNode);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }
  }

  async loadSong(url: string): Promise<void> {
    this.initContext();
    // Streaming proxy URLs can't be fully buffered — use MediaElement instead
    const needsStreaming = url.startsWith('/api/stream') || url.startsWith('http');
    this.isStreaming = needsStreaming;

    if (needsStreaming) {
      // Clean up previous media element
      if (this.mediaElement) {
        this.mediaElement.pause();
        this.mediaElement.src = '';
      }
      this.buffer = null;
      this.mediaElement = new Audio();
      this.mediaElement.crossOrigin = 'anonymous';
      this.mediaElement.src = url;
      this.mediaElement.onended = () => this.onEnded?.();

      // Connect media element to the Web Audio graph
      const elemSource = this.context!.createMediaElementSource(this.mediaElement);
      elemSource.connect(this.analyser!);
      this.source = elemSource;

      // Preload metadata so duration is available
      await new Promise<void>((resolve, reject) => {
        this.mediaElement!.oncanplay = () => resolve();
        this.mediaElement!.onerror = () => reject(new Error(`Failed to load stream: ${url}`));
        this.mediaElement!.load();
      });
    } else {
      // Local blob URL — buffer the whole file (fine for local files)
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        this.buffer = await this.context!.decodeAudioData(arrayBuffer);
        this.mediaElement = null;
      } catch (error) {
        console.error('AudioEngine: Failed to load song', error);
        throw error;
      }
    }
  }

  async play(volume: number = 0.8) {
    if (!this.context) return;

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this.gainNode!.gain.value = volume;

    if (this.isStreaming && this.mediaElement) {
      this.mediaElement.volume = 1; // gain node handles volume
      await this.mediaElement.play();
      return;
    }

    if (!this.buffer) {
      console.warn('AudioEngine: Cannot play, buffer missing');
      return;
    }

    this.stopBufferSource();

    const bufSource = this.context.createBufferSource();
    bufSource.buffer = this.buffer;
    bufSource.connect(this.analyser!);
    bufSource.onended = () => {
      // Only fire if we weren't manually stopped (pausedAt would be set)
      if (this.source === bufSource) {
        this.source = null;
        this.pausedAt = 0;
        this.onEnded?.();
      }
    };

    const offset = this.pausedAt;
    bufSource.start(0, offset);
    this.startTime = this.context.currentTime - offset;
    this.pausedAt = 0;
    this.source = bufSource;
  }

  pause() {
    if (this.isStreaming && this.mediaElement) {
      this.pausedAt = this.mediaElement.currentTime;
      this.mediaElement.pause();
      return;
    }
    if (!this.context || !this.source) return;
    this.pausedAt = this.context.currentTime - this.startTime;
    this.stopBufferSource();
  }

  stop() {
    if (this.isStreaming && this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.currentTime = 0;
      return;
    }
    this.stopBufferSource();
    this.pausedAt = 0;
  }

  private stopBufferSource() {
    if (this.source && this.source instanceof AudioBufferSourceNode) {
      try { this.source.stop(); } catch (_) {}
      this.source = null;
    }
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
    // Do NOT also set mediaElement.volume — it is locked to 1 so the gain node
    // is the sole volume control for both buffered and streaming sources.
  }

  /** Returns 0–1 progress through the current song, or 0 if unknown */
  getProgress(): number {
    if (this.isStreaming && this.mediaElement) {
      const dur = this.mediaElement.duration;
      if (!dur || !isFinite(dur)) return 0;
      return this.mediaElement.currentTime / dur;
    }
    if (!this.context || !this.buffer) return 0;
    const elapsed = this.context.currentTime - this.startTime + this.pausedAt;
    return Math.min(elapsed / this.buffer.duration, 1);
  }

  /** Returns current playback time in seconds */
  getCurrentTime(): number {
    if (this.isStreaming && this.mediaElement) return this.mediaElement.currentTime;
    if (!this.context) return 0;
    return this.context.currentTime - this.startTime + this.pausedAt;
  }

  /** Returns total duration in seconds, or 0 if unknown */
  getDuration(): number {
    if (this.isStreaming && this.mediaElement) return this.mediaElement.duration || 0;
    return this.buffer?.duration ?? 0;
  }

  getAnalysisData() {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);

    const bass = this.getAverageInRange(20, 250);
    const mid = this.getAverageInRange(250, 2000);
    const high = this.getAverageInRange(2000, 10000);

    return {
      raw: this.dataArray,
      bass: bass / 255,
      mid: mid / 255,
      high: high / 255,
      energy: (bass + mid + high) / (3 * 255),
    };
  }

  private getAverageInRange(lowFreq: number, highFreq: number): number {
    if (!this.analyser || !this.dataArray || !this.context) return 0;
    const nyquist = this.context.sampleRate / 2;
    const lowIndex = Math.round((lowFreq / nyquist) * this.analyser.frequencyBinCount);
    const highIndex = Math.round((highFreq / nyquist) * this.analyser.frequencyBinCount);
    let sum = 0;
    for (let i = lowIndex; i <= highIndex; i++) sum += this.dataArray[i];
    return sum / (highIndex - lowIndex + 1);
  }

  getAudioDestinationStream(): MediaStream | null {
    if (!this.context || !this.gainNode) return null;
    // Create once and cache — calling createMediaStreamDestination repeatedly leaks nodes
    if (!this._destStream) {
      const dest = this.context.createMediaStreamDestination();
      this.gainNode.connect(dest);
      this._destStream = dest.stream;
    }
    return this._destStream;
  }
  private _destStream: MediaStream | null = null;
}

export const audioEngine = new AudioEngine();
