#! /usr/bin/env node

import { NixEval } from "./nix-eval.js";
import process from "node:process";
import { readFileSync } from 'node:fs';
import { configure as getStringify } from './safe-stable-stringify/index.js'

const stringify = getStringify({
  maximumDepth: 2,
  maximumBreadth: 10,
  indent: "  ",
})



function main(argv) {

  if (process.stdin.isTTY && argv.length < 2) {
    const name = argv[0].split('/').pop();
    console.log(`usage:`);
    console.log(`node ${name} "__add 1 1"`);
    console.log(`node ${name} -f path/to/input.nix`);
    process.exit(1);
  }

  const text = (
    !process.stdin.isTTY
      ? readFileSync(0).toString() // read from stdin
      : (argv[1] == '-f')
        ? readFileSync(argv[2], 'utf8')
        : argv[1]
  );

  if (text === undefined) {
    throw new Error('text is undefined');
  }

  const nix = new NixEval();

  const result = nix.eval(text || '');

  //console.dir(result, { depth: 2 }); // getter values are missing
  //console.log(Object.assign({}, result)); // print everything -> too much
  console.log(stringify(result)); // TODO indent
  //console.log(JSON.stringify(result, null, 2)); // print everything -> too much

}



function log(obj) {
    // Get the names of getter properties defined on the prototype
    const ctor = obj.constructor;
    const proto = ctor?.prototype;
    const names = new Set(
        proto
            ? Object.entries(Object.getOwnPropertyDescriptors(proto))
                .filter(([_, {get}]) => !!get)
                .map(([name]) => name)
            : []
    );
    // Add in the names of "own" properties that don't start with "_"
    for (const name of Object.keys(obj)) {
        if (!name.startsWith("_")) {
            names.add(name);
        }
    }
    // Create a simple object with the values of those properties
    const simple = {};
    for (const name of names) {
        simple[name] = obj[name];
    }
    // See if we can get a "constructor" name for it, apply it if so
    let objName =
        obj[Symbol.toStringTag]
        || ctor?.name;
    if (objName) {
        simple[Symbol.toStringTag] = objName;
    }
    // Log it
    console.log(simple);
}

main(process.argv.slice(1));
