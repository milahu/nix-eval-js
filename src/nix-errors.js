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
