import NixEval from "../src/nix-eval.js";
import { configure as getStringify } from 'safe-stable-stringify'
import { fileTests } from './file-tests.js';

const stringify = getStringify({
  maximumDepth: 2,
  maximumBreadth: 10,
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
    const { name, text, expected: oldExpected, configStr, strict } = testData;
    //console.dir(testData); // debug

    const nix = new NixEval();
    const result = nix.eval(text);
    const newExpected = stringify(result);

    //if (name == 'some test name') { console.dir(testData) } // debug
    newTests.push(`#${name ? ' ' : ''}${name}${(configStr || '')}\n${text}\n==>\n${newExpected}`)
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
