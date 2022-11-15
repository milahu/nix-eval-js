import test from 'ava';
import * as fs from "node:fs"
import * as path from "node:path"
import process from "node:process"
import { fileURLToPath } from 'node:url';
import { NixEval, getStringifyResult } from "../src/nix-eval.js";
import { fileTests } from './file-tests.js';

const stringify = getStringifyResult({
  maximumDepth: 10,
  maximumBreadth: 100,
})

process.env.NIX_EVAL_JS_TEST_ENV = "hello"

let caseDir = path.dirname(fileURLToPath(import.meta.url))

for (let file of fs.readdirSync(caseDir)) {
  if (!/\.snapshots.txt$/.test(file)) continue
  const fileBase = file.slice(0, -1*'.snapshots.txt'.length)
  let filePath = path.join(caseDir, file)
  let fileContent = fs.readFileSync(filePath, "utf8")
  const newTests = []

  for (let testData of fileTests(fileContent, file)) {
    let { name, text: textJson, expected, configStr, strict } = testData;
    //console.dir(testData); // debug

    //console.log(`test: textJson: ${textJson}`)

    if (name) {
      name = `${name}: ${textJson} ==> ${expected}`
    }
    else {
      name = `${textJson} ==> ${expected}`
    }

    if (/SKIP/.test(name)) continue;

    const text = (() => {
      try {
        return JSON.parse(textJson);
      }
      catch (error) {
        error.message += `\nfailed to parse textJson: ${textJson}`
        throw error;
      }
    })();

    const nixOptions = {
      workdir: "/tmp/nix-eval-js/home/work",
    };

    if (expected.startsWith('ERROR ')) {
      const expectedParts = expected.split(' ');
      const expectedErrorName = expectedParts[1];
      const expectedErrorMessage = expectedParts.slice(2).join(' ');
      test(name, t => {
        const nix = new NixEval();
        let result;
        let actual;
        const error = t.throws(() => {
          result = nix.eval(text, nixOptions);
          // not done yet
          // some errors are triggered by stringify, because lazy eval
          // example: "{a=1;b=a;}"
          actual = result;
          if (fileBase == 'nix-eval') {
            actual = stringify(actual);
          }
          actual = String(actual);
        }, { instanceOf: Error });
        if (!error) {
          console.log(`expected error, got result:`);
          console.log(result);
        }
        // debug
        /** /
        console.dir({
          errorName: error.name,
          expectedErrorName,
        });
        console.dir({
          errorMessage: error.message,
          expectedErrorMessage,
        });
        /**/
        t.is(error.name, expectedErrorName);
        t.is(error.message, expectedErrorMessage);
      });
      continue;
    }

    test(name, t => {
      if (fileBase == 'nix-eval' || fileBase == 'nix-normal') {
        const nix = new NixEval();
        let result;
        let actual;
        if (fileBase == 'nix-eval') {
          result = nix.eval(text, nixOptions);
          actual = String(stringify(result));
        }
        else if (fileBase == 'nix-normal') {
          result = nix.normal(text, nixOptions);
          actual = String(result);
        }
        else {}
        t.is(actual.trim(), expected.trim());
      }
      else {
        throw new Error(`internal test error: unknown fileBase: ${fileBase}`)
      }
    });
  }
}
