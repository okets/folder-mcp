import { colors } from '../styles/colors.js';

export interface FlushingState {
  primaryWavePosition: number;    // Main wave position
  secondaryWavePosition: number;  // Secondary trailing wave
  sparklePositions: number[];     // Multiple sparkle effects
  pulseIntensity: number;        // Overall pulsing effect
  gradientShift: number;         // Color gradient shift
}

export class FlushingAnimation {
  private startTime: number = Date.now();
  private cycleDuration: number = 2000;
  private waveWidth: number = 0.15;
  private sparkleCount: number = 3;
  
  constructor(cycleDuration: number = 2000, waveWidth: number = 0.15) {
    this.cycleDuration = cycleDuration;
    this.waveWidth = waveWidth;
  }
  
  getFlushingState(): FlushingState {
    const elapsed = Date.now() - this.startTime;
    const cycleProgress = (elapsed % this.cycleDuration) / this.cycleDuration;
    
    // Primary wave travels from left to right
    const primaryWavePosition = (cycleProgress * 1.3) - 0.15;
    
    // Secondary wave follows behind with different timing
    const secondaryWavePosition = ((cycleProgress - 0.3) * 1.3) - 0.15;
    
    // Multiple sparkles at different speeds
    const sparklePositions = [];
    for (let i = 0; i < this.sparkleCount; i++) {
      const sparkleSpeed = 1.0 + (i * 0.4); // Different speeds
      const sparkleOffset = i * 0.2; // Staggered start
      const sparklePos = ((cycleProgress + sparkleOffset) * sparkleSpeed) % 1.4 - 0.2;
      sparklePositions.push(sparklePos);
    }
    
    // Pulsing effect - sine wave for smooth pulsing
    const pulseIntensity = (Math.sin(cycleProgress * Math.PI * 4) + 1) / 2;
    
    // Gradient shift for color transitions
    const gradientShift = Math.sin(cycleProgress * Math.PI * 2);
    
    return {
      primaryWavePosition,
      secondaryWavePosition,
      sparklePositions,
      pulseIntensity,
      gradientShift
    };
  }
  
  // For a progress bar position (0-1), get the character and color info
  getCharacterAtPosition(position: number, barProgress: number): { char: string; intensity: number; effect: string } {
    const state = this.getFlushingState();
    const { primaryWavePosition, secondaryWavePosition, sparklePositions, pulseIntensity, gradientShift } = state;
    
    // Check if this position is filled by the progress
    const isFilled = position <= barProgress;
    
    if (!isFilled) {
      // Even empty areas can have sparkles passing through
      const hasSparkle = sparklePositions.some(sparklePos => 
        Math.abs(position - sparklePos) < 0.02
      );
      return { 
        char: hasSparkle ? '✦' : '░', 
        intensity: hasSparkle ? 1.0 : 0.3,
        effect: hasSparkle ? 'sparkle' : 'empty'
      };
    }
    
    // Check for sparkles (highest priority)
    const sparkleDistance = Math.min(...sparklePositions.map(pos => Math.abs(position - pos)));
    if (sparkleDistance < 0.03) {
      const sparkleIntensity = 1.0 - (sparkleDistance / 0.03);
      return { 
        char: sparkleIntensity > 0.7 ? '✨' : sparkleIntensity > 0.4 ? '✦' : '◦',
        intensity: 1.2 + (sparkleIntensity * 0.5),
        effect: 'sparkle'
      };
    }
    
    // Check for primary wave
    const primaryDistance = Math.abs(position - primaryWavePosition);
    if (primaryDistance < this.waveWidth) {
      const waveIntensity = 1.0 - (primaryDistance / this.waveWidth);
      return { 
        char: waveIntensity > 0.8 ? '▓' : waveIntensity > 0.5 ? '▒' : '░',
        intensity: 0.7 + (waveIntensity * 0.4),
        effect: 'primary_wave'
      };
    }
    
    // Check for secondary wave
    const secondaryDistance = Math.abs(position - secondaryWavePosition);
    if (secondaryDistance < this.waveWidth * 0.7) {
      const waveIntensity = 1.0 - (secondaryDistance / (this.waveWidth * 0.7));
      return { 
        char: waveIntensity > 0.6 ? '▒' : '░',
        intensity: 0.6 + (waveIntensity * 0.3),
        effect: 'secondary_wave'
      };
    }
    
    // Base filled character with gradient effect
    const gradientEffect = 0.8 + (gradientShift * 0.2);
    const pulseEffect = 0.9 + (pulseIntensity * 0.2);
    
    return { 
      char: '█',
      intensity: gradientEffect * pulseEffect,
      effect: 'filled'
    };
  }
  
  // Generate full progress bar with impressive visual effects
  generateProgressBar(progress: number, width: number): { text: string; effects: Array<{pos: number; effect: string; intensity: number}> } {
    const barProgress = progress / 100;
    let result = '';
    const effects: Array<{pos: number; effect: string; intensity: number}> = [];
    
    for (let i = 0; i < width; i++) {
      const position = i / width;
      const charInfo = this.getCharacterAtPosition(position, barProgress);
      result += charInfo.char;
      
      if (charInfo.effect !== 'filled' && charInfo.effect !== 'empty') {
        effects.push({
          pos: i,
          effect: charInfo.effect,
          intensity: charInfo.intensity
        });
      }
    }
    
    return { text: result, effects };
  }
  
  // Generate simple progress bar string (for compatibility)
  generateSimpleProgressBar(progress: number, width: number): string {
    return this.generateProgressBar(progress, width).text;
  }
  
  getColor(baseColor: string): string {
    // Keep the base color for flushing bars
    return baseColor;
  }
  
  private getBrightVariant(baseColor: string): string {
    const variants: Record<string, string> = {
      [colors.blue]: colors.blue_bright,
      [colors.royal_blue]: colors.royal_blue_bright,
      [colors.cyan]: colors.cyan_bright,
      [colors.green]: colors.green_bright,
      [colors.deep_green]: colors.deep_green_bright,
      [colors.sage_green]: colors.sage_green_bright
    };
    return variants[baseColor] || baseColor;
  }
  
  private getPeakVariant(baseColor: string): string {
    const variants: Record<string, string> = {
      [colors.blue]: colors.blue_peak,
      [colors.royal_blue]: colors.royal_blue_peak,
      [colors.cyan]: colors.cyan_peak,
      [colors.green]: colors.green_peak,
      [colors.deep_green]: colors.deep_green_peak,
      [colors.sage_green]: colors.sage_green_peak
    };
    return variants[baseColor] || baseColor;
  }
  
  private interpolateColor(color1: string, color2: string, progress: number): string {
    // Simple interpolation - for demo purposes
    return progress < 0.5 ? color1 : color2;
  }
}

export function createFlushingHook() {
  return new FlushingAnimation();
}