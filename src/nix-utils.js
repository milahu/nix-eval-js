export function getSourceProp(node, state) {
  const source = {
    file: '(string)', // TODO nix file path
    from: node.from,
    to: node.to,
  };
  const setLineColumn = (lambdaSource) => {
    const sourceLines = state.source.split('\n');
    //console.log(`setLineColumn lambdaSource`, lambdaSource)
    //console.log(`setLineColumn sourceLines`, sourceLines)
    let lineFrom = 0;
    for (let lineIdx = 0; lineIdx < sourceLines.length; lineIdx++) {
      const line = sourceLines[lineIdx];
      const lineTo = lineFrom + line.length;
      if (lineFrom <= lambdaSource.from && lambdaSource.from <= lineTo) {
        // found line
        lambdaSource._line = lineIdx + 1; // lines are 1 based in Nix
        lambdaSource._column = (lambdaSource.from - lineFrom) + 1; // columns are 1 based in Nix
        return;
      }
      lineFrom += line.length + 1; // +1 for \n
    }
    // error
    lambdaSource._line = 'not';
    lambdaSource._column = 'found';
  }
  Object.defineProperty(source, 'line', {
    enumerable: true,
    get() {
      if (!this._line) setLineColumn(this);
      return this._line;
    },
  });
  Object.defineProperty(source, 'column', {
    enumerable: true,
    get() {
      if (!this._column) setLineColumn(this);
      return this._column;
    },
  });
  return source;
}
