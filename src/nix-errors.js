export class NixEvalError extends EvalError {
  constructor(message) {
    super(message);
    this.name = "NixEvalError";
  }
}

export class NixEvalNotImplemented extends EvalError {
  constructor(message) {
    super(message);
    this.name = "NixEvalNotImplemented";
  }
}

export class NixSyntaxError extends SyntaxError {
  constructor(message) {
    super(message);
    this.name = "NixSyntaxError";
  }
}
