import test from 'ava';
import { configure as getStringify } from 'safe-stable-stringify'
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from 'url';
import NixEval from "../src/nix-eval.js";
import { fileTests } from './file-tests.js';

const stringify = getStringify({
  maximumDepth: 2,
  maximumBreadth: 10,
})

let caseDir = path.dirname(fileURLToPath(import.meta.url))

for (let file of fs.readdirSync(caseDir)) {
  if (!/\.snapshots.txt$/.test(file)) continue
  let filePath = path.join(caseDir, file)
  let fileContent = fs.readFileSync(filePath, "utf8")
  const newTests = []

  for (let testData of fileTests(fileContent, file)) {
    const { name, text, expected, configStr, strict } = testData;
    //console.dir(testData); // debug

    test(`${text}`, t => {
      const nix = new NixEval();
      const result = nix.eval(JSON.parse(text));
      const actual = String(stringify(result));
      t.is(actual.trim(), expected.trim());
    });
  }
}
