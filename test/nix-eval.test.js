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

    if (expected.startsWith('ERROR ')) {
      const expectedParts = expected.split(' ');
      const expectedErrorName = expectedParts[1];
      const expectedMessage = expectedParts.slice(2).join(' ');
      test(`${text}`, t => {
        const nix = new NixEval();
        let result;
        const error = t.throws(() => {
          result = nix.eval(JSON.parse(text));
        }, { instanceOf: Error });
        if (!error) {
          console.log(`expected error, got result:`);
          console.log(result);
        }
        t.is(error.name, expectedErrorName);
        t.is(error.message, expectedMessage);
      });
      continue;
    }

    test(`${text}`, t => {
      const nix = new NixEval();
      const result = nix.eval(JSON.parse(text));
      const actual = String(stringify(result));
      t.is(actual.trim(), expected.trim());
    });
  }
}
