import { NixEvalError } from './nix-errors.js'

export const maxLoopCount = 100000;

export function resetInfiniteLoopCounter() {
  if (typeof global == 'object') {
    // node
    global.nixEval_infiniteLoopCounter = 0;
    return;
  }
  if (typeof window == 'object') {
    // browser
    window.nixEval_infiniteLoopCounter = 0;
    return;
  }
  throw new Error('not found global or window');
}

export const checkInfiniteLoop = (() => {
  if (typeof global == 'object') {
    // node
    return (
      function checkInfiniteLoop() {
        global.nixEval_infiniteLoopCounter++;
        if (global.nixEval_infiniteLoopCounter > maxLoopCount) {
          resetInfiniteLoopCounter();
          throw new NixEvalError('infinite loop?');
        }
      }
    )
  }
  if (typeof window == 'object') {
    // browser
    return (
      function checkInfiniteLoop() {
        window.nixEval_infiniteLoopCounter++;
        if (window.nixEval_infiniteLoopCounter > maxLoopCount) {
          resetInfiniteLoopCounter();
          throw new NixEvalError('infinite loop?');
        }
      }
    )
  }
  throw new Error('not found global or window');
})();
