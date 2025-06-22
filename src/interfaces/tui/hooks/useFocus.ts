import { useState } from 'react';

export type FocusArea = 'main' | 'status';

export interface FocusState {
  currentFocus: FocusArea;
  scrollPosition: {
    main: number;
    status: number;
  };
}

export const useFocus = () => {
  const [focusState, setFocusState] = useState<FocusState>({
    currentFocus: 'main',
    scrollPosition: {
      main: 0,
      status: 0
    }
  });

  const switchFocus = () => {
    setFocusState(prev => ({
      ...prev,
      currentFocus: prev.currentFocus === 'main' ? 'status' : 'main'
    }));
  };

  const scrollUp = () => {
    setFocusState(prev => ({
      ...prev,
      scrollPosition: {
        ...prev.scrollPosition,
        [prev.currentFocus]: Math.max(0, prev.scrollPosition[prev.currentFocus] - 1)
      }
    }));
  };

  const scrollDown = (maxScroll: number) => {
    setFocusState(prev => ({
      ...prev,
      scrollPosition: {
        ...prev.scrollPosition,
        [prev.currentFocus]: Math.min(maxScroll, prev.scrollPosition[prev.currentFocus] + 1)
      }
    }));
  };

  const resetScroll = (area?: FocusArea) => {
    if (area) {
      setFocusState(prev => ({
        ...prev,
        scrollPosition: {
          ...prev.scrollPosition,
          [area]: 0
        }
      }));
    } else {
      setFocusState(prev => ({
        ...prev,
        scrollPosition: {
          main: 0,
          status: 0
        }
      }));
    }
  };

  return {
    focusState,
    switchFocus,
    scrollUp,
    scrollDown,
    resetScroll
  };
};