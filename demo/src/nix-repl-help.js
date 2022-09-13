// help strings for the Nix repl



export const main = [

  'The following commands are available:',
  '',
  '  <expr>        Evaluate and print expression',
  '  :? e          Show available expressions',
  '  :? o          Show available operations',

];



export const expressions = [

  'The following expressions are available:',
  '',
  '  null          Null',
  '  true          True',
  '  false         False',
  '',
  '  1             Integer',
  '  1.2           Float',
  '',
  '  1+2           Add',
  '  1-2           Sub',
  '  1*2           Mul',
  '  1/2           Div',
  '',
  '  [1 2]         List',
  '  {a=1;b=2;}    AttrSet',
  '  {a=1;}.a      Select',

];



export const operations = [

  'The following operations are available:',
  '',
  '  __add 1 2',
  '  __sub 1 2',
  '  __mul 1 2',
  '  __div 1 2',
  '',
  '  __head [1 2]',
  '  __tail [1 2]',
  '  __elemAt [1 2] 0',
  '',
  '  __typeOf 1',

];



export const demos = [

  '-1',

  '1+2',
  '1-2',
  '1*2',
  '1/2',

  '2+3*4',
  '(2+3)*4',

  '[1 2]',

  '{a=1;b=2;}',
  '{a=1;}.a',

  '__add 1 2',
  '__sub 1 2',
  '__mul 1 2',
  '__div 1 2',

  '__head [1 2]',
  '__tail [1 2]',
  '__elemAt [1 2] 0',

  '__typeOf null',
  '__typeOf true',
  '__typeOf 1',
  '__typeOf 1.2',
  '__typeOf (-1)',
  '__typeOf (1+1)',

];
