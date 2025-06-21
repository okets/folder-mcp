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
    // Check if this position is filled by the progress
    const isFilled = position <= barProgress;
    
    if (!isFilled) {
      return { 
        char: '░', 
        intensity: 0.0,
        effect: 'empty'
      };
    }
    
    // Static progress bar - no animation
    return { 
      char: '█',
      intensity: 1.0,
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
      
      // No effects needed for static progress bar
    }
    
    return { text: result, effects };
  }
  
  // Generate simple progress bar string (for compatibility)
  generateSimpleProgressBar(progress: number, width: number): string {
    return this.generateProgressBar(progress, width).text;
  }
  
  // Get current spinner character or completion indicator
  getSpinner(progress: number, status: 'active' | 'complete' | 'error' | 'warning' = 'active'): string {
    // Show status indicator when complete
    if (progress >= 100) {
      switch (status) {
        case 'complete':
          return '✓';  // checkmark for success
        case 'error':
          return '✗';  // X for error
        case 'warning':
          return '⚠';  // warning triangle
        default:
          return '✓';  // default to success
      }
    }
    
    // Show spinner while in progress
    const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const elapsed = Date.now() - this.startTime;
    const frameIndex = Math.floor(elapsed / 80) % spinnerChars.length; // 80ms per frame
    return spinnerChars[frameIndex] || '⠋';
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