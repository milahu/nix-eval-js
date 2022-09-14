// performance regression test
// https://github.com/milahu/bipbip

import { NixEval } from "../src/nix-eval.js"

function evalNix(bench) {
  const nix = new NixEval()
  const text = bench.text()
  nix.eval(text)
}

function nots(count = 1000) {
  const expected = (count % 2 == 0) ? true : false
  return {
    name: `${count} nots`,
    text: () => "!".repeat(count) + "true",
    expected: () => expected,
  }
}

// debug
function sleep(time) {
    return new Promise(
      resolve => setTimeout(() => resolve(), time)
    );
}



suite('nots', () => {
    const countList = [
      1, 10,
      // TODO restore: 100, 1000, 2000, 3000,
      //3389, // maximum
      //3390, // FIXME Error: tree is empty
    ]

    for (const count of countList) {
      var bench = nots(count)
      scenario(bench.name, async () => {
          evalNix(bench)

          // FIXME? this cant be true ... or node optimization?
          // TODO check result value
          // $ npx bipbip test/benchmark.js 
          //   ✔ 1 nots: 18 ops/sec (±9.29%, ⨉92)
          //   ✔ 10 nots: 21 ops/sec (±6.58%, ⨉107)
          //   ✔ 100 nots: 21 ops/sec (±6.03%, ⨉107)
          //   ✔ 1000 nots: 19 ops/sec (±7.11%, ⨉96)
          //   ✔ 2000 nots: 19 ops/sec (±7.12%, ⨉97)
          //   ✔ 3000 nots: 20 ops/sec (±6.61%, ⨉100)

          // this works
          //await sleep(count)
          // $ npx bipbip test/benchmark.js 
          //   ✔ 1 nots: 20 ops/sec (±8.43%, ⨉100)
          //   ✔ 10 nots: 17 ops/sec (±5.17%, ⨉89)
          //   ✔ 100 nots: 5 ops/sec (±2.42%, ⨉29)
          //   ✔ 1000 nots: 1s per call (±0.24%, ⨉4)
          //   ✔ 2000 nots: 2s per call (±0.16%, ⨉2)
          //   ✔ 3000 nots: 3s per call (±0.00%, ⨉1)
      })
    }
})
