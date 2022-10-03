//import { printNode } from './nix-thunks-lezer-parser.js'

export function functionArgs(lambda) {
  //console.log("builtins.functionArgs:"); console.dir(lambda)
  return lambda.formalHasDefault || {};
}
