/**
 * Progress Bar Rendering Utility
 *
 * Renders ASCII progress bars for TUI components.
 * Used by ActivityLogItem to display in-progress events.
 */

export interface ProgressBarOptions {
  filledChar?: string;     // Character for filled portion (default: '█')
  emptyChar?: string;      // Character for empty portion (default: '░')
  showPercentage?: boolean; // Whether to append percentage text (default: false)
}

/**
 * Render a progress bar as a string
 *
 * @param percentage - Progress percentage (0-100)
 * @param width - Total width of the bar in characters
 * @param options - Optional rendering options
 * @returns The rendered progress bar string
 *
 * @example
 * renderProgressBar(45, 16)      → "███████░░░░░░░░░"
 * renderProgressBar(100, 10)     → "██████████"
 * renderProgressBar(50, 10, { showPercentage: true }) → "█████░░░░░ 50%"
 */
export function renderProgressBar(
  percentage: number,
  width: number,
  options: ProgressBarOptions = {}
): string {
  // Validate width - fail loudly if invalid (not finite positive number)
  if (!Number.isFinite(width) || width < 1) {
    throw new TypeError(`renderProgressBar: width must be a finite positive number, got ${width}`);
  }

  const {
    filledChar = '█',
    emptyChar = '░',
    showPercentage = false
  } = options;

  // Clamp percentage between 0 and 100 (handle NaN/Infinity gracefully)
  const clampedPercentage = Number.isFinite(percentage)
    ? Math.max(0, Math.min(100, percentage))
    : 0;

  // Calculate the bar width (account for percentage suffix if shown)
  let barWidth = width;
  let percentageSuffix = '';

  if (showPercentage) {
    // Format: "████░░░░ 45%" - reserve space for " XXX%"
    percentageSuffix = ` ${Math.round(clampedPercentage)}%`;
    barWidth = Math.max(1, width - percentageSuffix.length);
  }

  // Calculate filled portion
  const filledCount = Math.round((clampedPercentage / 100) * barWidth);
  const emptyCount = barWidth - filledCount;

  // Build the bar
  const bar = filledChar.repeat(filledCount) + emptyChar.repeat(emptyCount);

  return bar + percentageSuffix;
}

/**
 * Get the icon for an activity event type
 *
 * Icons indicate WHAT happened (event type), not HOW it went (status).
 * Color indicates status (in-progress, completed, error, info).
 *
 * All icons are single-cell ASCII symbols for consistent layout.
 * Note: '▶' is reserved for cursor, not used here.
 *
 * @param type - The event type (indexing, search, connection, system, model, config)
 * @returns The appropriate ASCII symbol (single-cell)
 */
export function getActivityIcon(type: string): string {
  switch (type) {
    case 'indexing':
      return '◆';  // Solid diamond - indexing operation
    case 'search':
      return '◎';  // Bullseye - search target
    case 'connection':
      return '●';  // Solid circle - connection event
    case 'model':
      return '◇';  // Hollow diamond - model-related
    case 'system':
      return '★';  // Star - system events
    case 'config':
      return '⚙';  // Gear - configuration
    case 'error':
      return '⚠';  // Warning triangle - errors
    default:
      return '•';  // Bullet - other
  }
}

/**
 * Format a timestamp for display in the activity log
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string (e.g., "14:32") or '--:--' for invalid timestamps
 */
export function formatActivityTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    // Check for invalid dates explicitly before formatting
    if (isNaN(date.getTime())) {
      return '--:--';
    }
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return '--:--';
  }
}
