export class NixEvalError extends EvalError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NixEvalNotImplemented extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NixSyntaxError extends SyntaxError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}
