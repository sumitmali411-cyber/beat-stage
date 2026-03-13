export class AudioEngine {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private dataArray: Uint8Array | null = null;
  private buffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pausedAt: number = 0;

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
    try {
      this.initContext();
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      this.buffer = await this.context!.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error("AudioEngine: Failed to load song", error);
      throw error;
    }
  }

  async play(volume: number = 0.8) {
    if (!this.context || !this.buffer) {
      console.warn("AudioEngine: Cannot play, context or buffer missing", { context: !!this.context, buffer: !!this.buffer });
      return;
    }
    
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this.stop();
    
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.analyser!);
    
    this.gainNode!.gain.value = volume;
    
    const offset = this.pausedAt;
    this.source.start(0, offset);
    this.startTime = this.context.currentTime - offset;
    this.pausedAt = 0;
    console.log("AudioEngine: Playback started at offset", offset);
  }

  pause() {
    if (!this.context || !this.source) return;
    this.pausedAt = this.context.currentTime - this.startTime;
    this.source.stop();
    this.source = null;
  }

  stop() {
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
    this.pausedAt = 0;
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
  }

  getAnalysisData() {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Split into bands
    const bass = this.getAverageInRange(20, 250);
    const mid = this.getAverageInRange(250, 2000);
    const high = this.getAverageInRange(2000, 10000);
    
    return {
      raw: this.dataArray,
      bass: bass / 255,
      mid: mid / 255,
      high: high / 255,
      energy: (bass + mid + high) / (3 * 255)
    };
  }

  private getAverageInRange(lowFreq: number, highFreq: number): number {
    if (!this.analyser || !this.dataArray) return 0;
    const nyquist = this.context!.sampleRate / 2;
    const lowIndex = Math.round((lowFreq / nyquist) * this.analyser.frequencyBinCount);
    const highIndex = Math.round((highFreq / nyquist) * this.analyser.frequencyBinCount);
    
    let sum = 0;
    for (let i = lowIndex; i <= highIndex; i++) {
      sum += this.dataArray[i];
    }
    return sum / (highIndex - lowIndex + 1);
  }

  getCanvasStream(): MediaStream | null {
    // This will be used for recording, capturing from the canvas
    return null; 
  }

  getAudioDestinationStream(): MediaStream | null {
    if (!this.context || !this.gainNode) return null;
    const dest = this.context.createMediaStreamDestination();
    this.gainNode.connect(dest);
    return dest.stream;
  }
}

export const audioEngine = new AudioEngine();
