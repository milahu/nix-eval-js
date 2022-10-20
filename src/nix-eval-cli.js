#! /usr/bin/env node

import { NixEval, getStringifyResult } from "./nix-eval.js";
import process from "node:process";
import { readFileSync } from 'node:fs';

const stringify = getStringifyResult({
  maximumDepth: 2,
  maximumBreadth: 10,
  indent: "  ",
})



function main(argv) {

  // TODO remove argv[0]
  //argv.shift();

  const options = {};

  if (argv[1] == '--normal') {
    options.normal = true
    argv = [argv[0], ...argv.slice(2)]
    // TODO
    //argv.shift();
  }

  if (argv[1] == '-f' || argv[1] == '--file') {
    const nix = new NixEval();
    const result = nix.evalFile(argv[2], options);
    console.log(stringify(result));
    return
  }

  const { text } = (() => {
    if (!process.stdin.isTTY) { // FIXME condition for stdin
      return {
        text: readFileSync(0).toString(), // read from stdin
      };
    }
    if (argv[1] == '-e' || argv[1] == '--expr') {
      return {
        text: argv[2],
      };
    }
    const name = argv[0].split('/').pop();
    console.error(`usage:`);
    console.error(`node ${name} -e "__add 1 1"`);
    console.error(`node ${name} -f path/to/input.nix`);
    console.error(`echo "__add 1 1" | node ${name}`);
    console.error(`node ${name} --normal -e "__add 1 1"`);
    process.exit(1);
  })();

  if (text === undefined) {
    throw new Error('text is undefined');
  }

  const nix = new NixEval();

  const result = nix.eval(text || '', options);

  //console.dir(result, { depth: 2 }); // getter values are missing
  //console.log(Object.assign({}, result)); // print everything -> too much
  if (options.normal) {
    // dont stringify
    console.log(result)
    return
  }
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
