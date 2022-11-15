import { NixEval, getStringifyResult } from "../src/nix-eval.js";

import child_process from 'child_process'

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
  const fileBase = file.slice(0, -1*'.snapshots.txt'.length)
  let filePath = path.join(caseDir, file)
  let fileContent = fs.readFileSync(filePath, "utf8")
  const newTests = []
  for (let testData of fileTests(fileContent, file)) {
    const { name, text: textJson, expected: oldExpected, configStr, strict } = testData;
    //console.dir(testData); // debug

    console.log(`update: textJson: ${textJson}`)

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
      if (fileBase == 'nix-eval') {
        result = nix.eval(text)
      }
      else if (fileBase == 'nix-normal') {
        //result = nix.normal(text)
        fs.mkdirSync('/tmp/nix-eval-js/home/work', { recursive: true })
        const nix_instantiate = child_process.spawnSync(
          'nix-instantiate', [
            '--parse',
            '--expr',
            text,
          ],
          {
            //stdio: 'inherit',
            encoding: 'utf8',
            cwd: '/tmp/nix-eval-js/home/work', // must exist
            env: Object.assign({}, process.env, {
              // $HOME must be owned by user
              // https://github.com/NixOS/nix/issues/6834
              HOME: '/tmp/nix-eval-js/home',
            }),
          }
        )
        result = nix_instantiate.output[1].trim()
        
        if (result == '' && nix_instantiate.status != 0) {
          result = nix_instantiate.output[2].split("\n")[0]
          //console.dir({ result })
          if (result.startsWith('error: ')) {
            result = 'ERROR EvalError ' + result.slice('error: '.length)
          }
        }
        //console.dir({ nix_instantiate, result }); throw new Error("todo")
      }
      else {
        throw new Error(`internal test error: unknown fileBase: ${fileBase}`)
      }
    }
    catch (_error) {
      //if (fileBase == 'nix-normal') throw _error
      if (
        _error.message && (
          _error.message.startsWith('internal test error: unknown fileBase') ||
          _error.message == 'todo'
        )
      ) {
        throw _error
      }
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
        if (fileBase == 'nix-eval') {
          resultString = String(stringify(result));
        }
        else {
          // dont stringify
          resultString = String(result);
        }
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
