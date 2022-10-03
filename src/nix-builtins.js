//import { printNode } from './nix-thunks-lezer-parser.js'

import process from 'node:process'

export function functionArgs(lambda) {
  //console.log("builtins.functionArgs:"); console.dir(lambda)
  return lambda.formalHasDefault || {};
}

export function intersectAttrs(set1) {
  // key must be in set1 and set2
  // use value from set2
  // TODO check type set1
  //console.log(`builtins.intersectAttrs: set1.data:`); console.dir(set1.data)
  return function intersectAttrs2(set2) {
    // TODO check type set2
    //console.log(`builtins.intersectAttrs: set2.data:`); console.dir(set2.data)
    const resultEnv = set2.parent.newChild()
    for (const key1 in set1.data) {
      //console.log(`builtins.intersectAttrs: key1 ${key1}`);
      if (!(key1 in set2.data)) continue
      // key1 == key2
      resultEnv.data[key1] = set2.data[key1]
    }
    return resultEnv
  }
}

export function getEnv(key) {
  //console.log("builtins.getEnv:"); console.dir(key)
  return process.env[key]
}
