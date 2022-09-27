export class NixEvalError extends EvalError {
  constructor(message) {
    super(message);
    //this.name = this.constructor.name;
    //this.name = "EvalError"
  }
}

export class NixEvalNotImplemented extends Error {
  constructor(message) {
    super(message);
    this.name = "EvalNotImplemented"
  }
}

export class NixSyntaxError extends SyntaxError {
  constructor(message) {
    super(message);
    //this.name = this.constructor.name;
    //this.name = "SyntaxError"
  }
}
