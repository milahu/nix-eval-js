export class NixEvalError extends EvalError {
  constructor(message) {
    super(message);
    this.name = "EvalError";
  }
}

export class NixEvalNotImplemented extends EvalError {
  constructor(message) {
    super(message);
    this.name = "NotImplemented";
  }
}

export class NixSyntaxError extends SyntaxError {
  constructor(message) {
    super(message);
    this.name = "SyntaxError";
  }
}
