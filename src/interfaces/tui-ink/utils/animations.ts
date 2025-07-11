/**
 * Animation presets for TUI components
 * Contains frame arrays for various animation types
 */

/**
 * Braille spinner animation frames
 * Smooth rotation effect using braille characters
 */
export const BRAILLE_SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Dots animation frames
 * Growing dots effect
 */
export const DOTS_ANIMATION = ['⋯', '·⋯', '··⋯', '···⋯'];

/**
 * Simple spinner using basic ASCII
 * Fallback for environments without Unicode support
 */
export const ASCII_SPINNER = ['|', '/', '-', '\\'];

/**
 * Clock spinner animation
 * Uses clock face characters
 */
export const CLOCK_SPINNER = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];

/**
 * Arrow spinner animation
 * Rotating arrow effect
 */
export const ARROW_SPINNER = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

/**
 * Box drawing spinner
 * Uses box drawing characters for a unique effect
 */
export const BOX_SPINNER = ['▖', '▘', '▝', '▗'];

/**
 * Creates a progress bar animation with smooth fill effect
 * @param width Total width of the progress bar
 * @param fillChar Character to use for filled portion (default: ▰)
 * @param emptyChar Character to use for empty portion (default: ▱)
 * @returns Array of frames showing progressive fill
 */
export function createProgressBarFrames(
    width: number = 10,
    fillChar: string = '▰',
    emptyChar: string = '▱'
): string[] {
    const frames: string[] = [];
    
    // Create frames for 0% to 100%
    for (let i = 0; i <= width; i++) {
        const filled = fillChar.repeat(i);
        const empty = emptyChar.repeat(width - i);
        frames.push(filled + empty);
    }
    
    return frames;
}

/**
 * Creates a smooth wave animation
 * @param width Total width of the animation
 * @param waveChar Character to use for the wave (default: ▓)
 * @param bgChar Background character (default: ░)
 * @returns Array of frames showing wave motion
 */
export function createWaveFrames(
    width: number = 20,
    waveChar: string = '▓',
    bgChar: string = '░'
): string[] {
    const frames: string[] = [];
    const waveWidth = 4; // Width of the wave peak
    
    // Create frames for wave moving across
    for (let pos = -waveWidth; pos <= width; pos++) {
        let frame = '';
        for (let i = 0; i < width; i++) {
            // Create a bell curve for the wave
            const distance = Math.abs(i - pos);
            if (distance < waveWidth / 2) {
                frame += waveChar;
            } else {
                frame += bgChar;
            }
        }
        frames.push(frame);
    }
    
    return frames;
}

/**
 * Creates a pulsing animation with varying intensity
 * @param baseChar Base character to pulse
 * @param maxWidth Maximum width during pulse
 * @returns Array of frames showing pulse effect
 */
export function createPulseFrames(
    baseChar: string = '●',
    maxWidth: number = 5
): string[] {
    const frames: string[] = [];
    
    // Grow phase
    for (let i = 1; i <= maxWidth; i++) {
        frames.push(baseChar.repeat(i));
    }
    
    // Shrink phase
    for (let i = maxWidth - 1; i >= 1; i--) {
        frames.push(baseChar.repeat(i));
    }
    
    return frames;
}

/**
 * Animation timing presets in milliseconds
 */
export const ANIMATION_TIMINGS = {
    VERY_FAST: 50,
    FAST: 80,
    NORMAL: 100,
    SLOW: 200,
    VERY_SLOW: 500
};

/**
 * Default spinner for general use
 */
export const DEFAULT_SPINNER = BRAILLE_SPINNER;

/**
 * Default timing for animations
 */
export const DEFAULT_TIMING = ANIMATION_TIMINGS.FAST;

/**
 * Exit countdown animation frames - orange pulse with ANSI escape codes
 * 8 frames, variable width, pulsing red/orange waves around "esc to exit" text
 * Uses ANSI color codes: \x1b[91m (bright red), \x1b[31m (red), \x1b[2;31m (dim red), \x1b[0m (reset)
 */
export const EXIT_COUNTDOWN_FRAMES = [
    // Frame 0: Single bright wave
    "\x1b[91m(\x1b[0m esc to exit \x1b[91m)\x1b[0m",
    
    // Frame 1: Double wave (dim, bright)
    "\x1b[31m(\x1b[0m\x1b[91m(\x1b[0m esc to exit \x1b[91m)\x1b[0m\x1b[31m)\x1b[0m",
    
    // Frame 2: Triple wave (dim, medium, bright) 
    "\x1b[2;31m(\x1b[0m\x1b[31m(\x1b[0m\x1b[91m(\x1b[0m esc to exit \x1b[91m)\x1b[0m\x1b[31m)\x1b[0m\x1b[2;31m)\x1b[0m",
    
    // Frame 3: Quad wave (all medium intensity)
    "\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m\x1b[31m(\x1b[0m\x1b[31m(\x1b[0m esc to exit \x1b[31m)\x1b[0m\x1b[31m)\x1b[0m\x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m",
    
    // Frame 4: Quad wave (fading)
    "\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m\x1b[31m(\x1b[0m esc to exit \x1b[31m)\x1b[0m\x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m",
    
    // Frame 5: Quad wave (very dim)
    "\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m esc to exit \x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m",
    
    // Frame 6: Quad wave (barely visible)
    "\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m esc to exit \x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m",
    
    // Frame 7: Same as frame 6 (minimal visibility)
    "\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m\x1b[2;31m(\x1b[0m esc to exit \x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m\x1b[2;31m)\x1b[0m"
];

/**
 * Exit countdown timing - 8 frames over 3 seconds = 375ms per frame
 * Originally 200ms per frame for a quick pulse, but slowed down for 3-second exit window
 */
export const EXIT_COUNTDOWN_TIMING = 375;