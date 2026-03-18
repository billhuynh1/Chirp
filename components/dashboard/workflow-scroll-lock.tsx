'use client';

import { useEffect } from 'react';

let lockCount = 0;
let previousHtmlOverflow = '';
let previousBodyOverflow = '';
let previousHtmlOverscrollBehavior = '';
let previousBodyOverscrollBehavior = '';

export function WorkflowScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (lockCount === 0) {
      previousHtmlOverflow = html.style.overflow;
      previousBodyOverflow = body.style.overflow;
      previousHtmlOverscrollBehavior = html.style.overscrollBehavior;
      previousBodyOverscrollBehavior = body.style.overscrollBehavior;

      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      html.style.overscrollBehavior = 'none';
      body.style.overscrollBehavior = 'none';
    }

    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount !== 0) {
        return;
      }

      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
    };
  }, []);

  return null;
}
