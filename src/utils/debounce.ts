/**
 * Debounce utility for rate-limiting function calls
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds 
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastCallTime: number = 0;
  
  return function debounced(...args: Parameters<T>) {
    const now = Date.now();
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    const timeSinceLastCall = now - lastCallTime;
    
    timeout = setTimeout(() => {
      func(...args);
      lastCallTime = Date.now();
      timeout = null;
    }, wait);
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastCallTime: number = 0;
  let lastArgs: Parameters<T> | null = null;
  
  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    lastArgs = args;
    
    if (timeSinceLastCall >= wait) {
      // Enough time has passed, execute immediately
      func(...args);
      lastCallTime = now;
      lastArgs = null;
    } else if (!timeout) {
      // Schedule execution for the remaining time
      const remainingTime = wait - timeSinceLastCall;
      timeout = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
          lastCallTime = Date.now();
          lastArgs = null;
        }
        timeout = null;
      }, remainingTime);
    }
  };
}