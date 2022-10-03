import { NixEval, getStringifyResult } from "../src/nix-eval.js";

import { fileTests } from './file-tests.js';

const stringify = getStringifyResult({
  maximumDepth: 10,
  maximumBreadth: 100,
})

import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from 'url';

let caseDir = path.dirname(fileURLToPath(import.meta.url))

for (let file of fs.readdirSync(caseDir)) {
  if (!/\.snapshots.txt$/.test(file)) continue
  let filePath = path.join(caseDir, file)
  let fileContent = fs.readFileSync(filePath, "utf8")
  const newTests = []
  for (let testData of fileTests(fileContent, file)) {
    const { name, text: textJson, expected: oldExpected, configStr, strict } = testData;
    //console.dir(testData); // debug

    if (/SKIP/.test(name)) {
      // no change
      newTests.push(`#${name ? ' ' : ''}${name}${(configStr || '')}\n${textJson}\n==>\n${oldExpected}`);
      continue;
    }

    const nix = new NixEval();

    let result;
    let resultString;
    let error;
    let newExpected;
    const text = JSON.parse(textJson);

    try {
      result = nix.eval(text);
    }
    catch (_error) {
      error = _error;
    }

    if (error) {
      newExpected = `ERROR ${error.name} ${error.message}`;
    }
    else {
      try {
        // not done yet
        // some errors are triggered by stringify, because lazy eval
        // example: "{a=1;b=a;}"
        resultString = String(stringify(result));
      }
      catch (_error) {
        error = _error;
      }
      if (error) {
        newExpected = `ERROR ${error.name} ${error.message}`;
      }
      else {
        // done
        newExpected = resultString;
      }
    }

    //if (name == 'some test name') { console.dir(testData) } // debug
    newTests.push(`#${name ? ' ' : ''}${name}${(configStr || '')}\n${textJson}\n==>\n${newExpected}`)
  }
  const newFileContent = newTests.join("\n\n") + "\n";
  const dryRun = false;
  if (dryRun) {
    console.log(newFileContent);
  }
  else {
    // TODO backup?
    console.log(`writing ${filePath}`);
    fs.writeFileSync(filePath, newFileContent, "utf8");
  }
}
