// based on lezer-parser-nix/test/update-expressions.js

// use a patched version of fileTests to parse test files
// https://github.com/lezer-parser/generator/pull/7
// https://github.com/lezer-parser/generator/pull/8
// https://github.com/lezer-parser/generator/blob/main/src/test.ts
//import {fileTests} from "@lezer/generator/dist/test"
function toLineContext(file, index) {
  const endEol = file.indexOf('\n', index + 80);
  const endIndex = endEol === -1 ? file.length : endEol;
  return file.substring(index, endIndex).split(/\n/).map(str => '  | ' + str).join('\n');
}

const defaultIgnore = false

export function fileTests(file, fileName, mayIgnore = defaultIgnore) {
  let caseExpr = /#[ \t]*(.*)(?:\r\n|\r|\n)([^]*?)==+>([^]*?)(?:$|(?:\r\n|\r|\n)+(?=#))/gy
  let tests = []
  let lastIndex = 0;
  for (;;) {
    let m = caseExpr.exec(file)
    if (!m) throw new Error(`Unexpected file format in ${fileName} around\n\n${toLineContext(file, lastIndex)}`)
    let execResult = /(.*?)(\{.*?\})?$/.exec(m[1])
    if (execResult === null) throw Error('execResult is null')
    let [, name, configStr] = execResult
    let text = m[2].trim(), expected = m[3].trim()
    let config = configStr ? JSON.parse(configStr) : null
    let strict = !/⚠|\.\.\./.test(expected)
    tests.push({ name, text, expected, configStr, config, strict })
    lastIndex = m.index + m[0].length
    if (lastIndex == file.length) break
  }
  return tests
}
