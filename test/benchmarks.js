// performance regression test
// https://github.com/milahu/bipbip

import { NixEval, getStringifyResult } from "../src/nix-eval.js"

const stringifyResult = getStringifyResult()

function evalNix(bench) {
  const debugEvalNix = false
  const nix = new NixEval()
  const text = bench.text()
  if (debugEvalNix) {
    const textShort = text.length < 100 ? text : (text.slice(0, 40) + ' ... ' + text.slice(-40) + ` (length ${text.length})`)
    console.log('\n' + textShort)
  }
  const result = nix.eval(text)
  // stringify to force eval of lazy values
  stringifyResult(result)
}

// debug
function sleep(time) {
    return new Promise(
      resolve => setTimeout(() => resolve(), time)
    )
}



// run a constant benchmark suite before and after our tests
// so we can normalize performance across different CPUs

// bipbip/__benchmarks__/fibonacci.js

function fibonaciSuite(name) {
  function loop(input) {
      let num = input
      let a = 1
      let b = 0
      let temp
      while (num >= 0) {
          temp = a
          a += b
          b = temp
          num -= 1
      }
      return b
  }
  function recursive(num) {
      if (num <= 1) return 1
      return recursive(num - 1) + recursive(num - 2)
  }
  function recmemo(num, memo = {}) {
      if (memo[num]) return memo[num]
      if (num <= 1) return 1
      memo[num] =
          recmemo(num - 1, memo) +
          recmemo(num - 2, memo)
      return memo[num]
  }
  suite(`fibonacci ${name}`, () => {
      const input = 20
      scenario('loop', () => { loop(input) })
      scenario('recursive', () => { recursive(input) })
      scenario('recmemo', () => { recmemo(input) })
  })
}



// note: the first suite name ist not printed to console
fibonaciSuite('before benchmarks')



function nots(count = 1000) {
  const expected = (count % 2 == 0) ? true : false
  return {
    name: `${count} nots`,
    text: () => "!".repeat(count) + "true",
    expected: () => expected,
  }
}

suite('nots', () => {
    const countList = [
      10, 100, 1000,
      //3389, // maximum
      //3390, // FIXME Error: tree is empty
    ]

    for (const count of countList) {
      // note: bench must be const
      const bench = nots(count)
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



function fibonacci(input = 1000) {
  function fibonacci_loop(input) {
      let num = input
      let a = 1
      let b = 0
      let temp
      while (num >= 0) {
          temp = a
          a += b
          b = temp
          num -= 1
      }
      return b
  }
  return {
    name: `fibonacci ${input}`,
    text: () => `let f = i: n: m: if i == 0 then n else f (i - 1) m (n + m); fib = n: f n 1 1; in fib ${input}`,
    // TODO bigint vs number
    expected: () => fibonacci_loop(input),
  }
}

suite('fibonacci', () => {
    const inputList = [
      10, 100, 1000,
      // soft maximum. sometimes more, sometimes less
      // FIXME RangeError: Maximum call stack size exceeded
      // nix allows deeper recursion
    ]

    for (const input of inputList) {
      // note: bench must be const
      const bench = fibonacci(input)
      scenario(bench.name, async () => {
          evalNix(bench)
      })
    }
})



fibonaciSuite('after benchmarks')
