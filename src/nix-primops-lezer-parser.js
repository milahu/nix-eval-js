/*
cat nix/src/libexpr/primops.cc | grep '.name = "__' | cut -d'"' -f2 | sed -E 's/^(.*)$/  "\1": arg => arg,/'
*/

import { NixEvalError } from "./nix-errors.js";

export const NixPrimops = {

  "__typeOf": arg => {
    if (arg === null) return 'null'; // js: typeof(null) == 'object'
    if (arg === true || arg === false) return 'bool';
    if (Array.isArray(arg)) return 'list';
    if (arg instanceof Object) return 'set';
    const javascriptType = typeof(arg);
    if (javascriptType == 'bigint') {
      return 'int';
    }
    if (javascriptType == 'number') {
      return 'float';
    }
    // TODO handle more cases?
    return javascriptType; // string
  },

  "__isFunction": arg => typeof(arg) == 'function',
  "__isInt": arg => (typeof(arg) == 'number' && (arg|0) == arg),
  "__isFloat": arg => typeof(arg) == 'number',
  "__isString": arg => typeof(arg) == 'string',
  "__isBool": arg => typeof(arg) == 'boolean',

  /*
  "__isPath": arg => arg,
  "__genericClosure": arg => arg,
  "__addErrorContext": arg => arg,
  */

  "__ceil": float => Math.ceil(float),
  "__floor": float => Math.floor(float),

  /*
  "__tryEval": arg => arg,
  "__getEnv": arg => arg,
  "__seq": arg => arg,
  "__deepSeq": arg => arg,
  "__trace": arg => arg,
  "__toPath": arg => arg,
  "__storePath": arg => arg,
  "__pathExists": arg => arg,
  "__readFile": arg => arg,
  "__findFile": arg => arg,
  "__hashFile": arg => arg,
  "__readDir": arg => arg,
  "__toXML": arg => arg,
  "__toJSON": arg => arg,
  "__fromJSON": arg => arg,
  "__toFile": arg => arg,
  "__filterSource": arg => arg,
  "__path": arg => arg,
  "__attrNames": arg => arg,
  "__attrValues": arg => arg,
  "__getAttr": arg => arg,
  "__unsafeGetAttrPos": arg => arg,
  "__hasAttr": arg => arg,
  "__isAttrs": arg => arg,
  "__listToAttrs": arg => arg,
  "__intersectAttrs": arg => arg,
  "__catAttrs": arg => arg,
  "__functionArgs": arg => arg,
  "__mapAttrs": arg => arg,
  "__zipAttrsWith": arg => arg,
  */

  // TODO verify
  "__isList": arg => Array.isArray(arg),

  // TODO check types
  "__elemAt": list => (index => {
    if (index < 0 || list.length <= index) {
      throw new NixEvalError(`list index ${index} is out of bounds`);
    }
    return list[index];
  }),

  // TODO check types
  // TODO check bounds
  "__head": list => list[0],
  "__tail": list => list[list.length - 1],
  "__filter": list => list[list.length - 1],

  /*
  "__elem": arg => arg,
  "__concatLists": arg => arg,
  "__length": arg => arg,
  "__foldl'": arg => arg,
  "__any": arg => arg,
  "__all": arg => arg,
  "__genList": arg => arg,
  "__sort": arg => arg,
  "__partition": arg => arg,
  "__groupBy": arg => arg,
  "__concatMap": arg => arg,
  */

  // TODO? refactor binary operators
  "__add": value1 => (value2 => {

    // int + float -> float
    if (typeof(value1) == 'bigint' && typeof(value2) == 'number') {
      return parseFloat(value1) + value2;
    }

    // float + int -> float
    if (typeof(value1) == 'number' && typeof(value2) == 'bigint') {
      return value1 + parseFloat(value2);
    }

    // float + float -> float
    if (typeof(value1) == 'number' && typeof(value2) == 'number') {
      return value1 + value2;
    }

    // int + int -> int
    if (typeof(value1) == 'bigint' && typeof(value2) == 'bigint') {
      return value1 + value2;
    }

    if (typeof(value1) != 'bigint' && typeof(value1) != 'number') {
      if (typeof(value2) == 'bigint' || typeof(value2) == 'number') {
        throw new NixEvalError(`value is ${nixTypeWithArticle(value1)} while ${nixTypeWithArticle(value2)} was expected`)
      }
      throw new NixEvalError(`value is ${nixTypeWithArticle(value1)} while an integer was expected`)
    }

    if (typeof(value2) != 'bigint' && typeof(value2) != 'number') {
      throw new NixEvalError(`value is ${nixTypeWithArticle(value2)} while ${nixTypeWithArticle(value1)} was expected`)
    }

  }),

  "__sub": value1 => (value2 => {

    // int - float -> float
    if (typeof(value1) == 'bigint' && typeof(value2) == 'number') {
      return parseFloat(value1) - value2;
    }

    // float - int -> float
    if (typeof(value1) == 'number' && typeof(value2) == 'bigint') {
      return value1 - parseFloat(value2);
    }

    // float - float -> float
    if (typeof(value1) == 'number' && typeof(value2) == 'number') {
      return value1 - value2;
    }

    // int - int -> int
    if (typeof(value1) == 'bigint' && typeof(value2) == 'bigint') {
      return value1 - value2;
    }

    if (typeof(value1) != 'bigint' && typeof(value1) != 'number') {
      if (typeof(value2) == 'bigint' || typeof(value2) == 'number') {
        throw new NixEvalError(`value is ${nixTypeWithArticle(value1)} while ${nixTypeWithArticle(value2)} was expected`)
      }
      throw new NixEvalError(`value is ${nixTypeWithArticle(value1)} while an integer was expected`)
    }

    if (typeof(value2) != 'bigint' && typeof(value2) != 'number') {
      throw new NixEvalError(`value is ${nixTypeWithArticle(value2)} while ${nixTypeWithArticle(value1)} was expected`)
    }

  }),

  "__mul": value1 => (value2 => {

    // int * float -> float
    if (typeof(value1) == 'bigint' && typeof(value2) == 'number') {
      return parseFloat(value1) * value2;
    }

    // float * int -> float
    if (typeof(value1) == 'number' && typeof(value2) == 'bigint') {
      return value1 * parseFloat(value2);
    }

    // float * float -> float
    if (typeof(value1) == 'number' && typeof(value2) == 'number') {
      return value1 * value2;
    }

    // int * int -> int
    if (typeof(value1) == 'bigint' && typeof(value2) == 'bigint') {
      return value1 * value2;
    }

    if (typeof(value1) != 'bigint' && typeof(value1) != 'number') {
      if (typeof(value2) == 'bigint' || typeof(value2) == 'number') {
        throw new NixEvalError(`value is ${nixTypeWithArticle(value1)} while ${nixTypeWithArticle(value2)} was expected`)
      }
      throw new NixEvalError(`value is ${nixTypeWithArticle(value1)} while an integer was expected`)
    }

    if (typeof(value2) != 'bigint' && typeof(value2) != 'number') {
      throw new NixEvalError(`value is ${nixTypeWithArticle(value2)} while ${nixTypeWithArticle(value1)} was expected`)
    }

  }),

  // TODO error: division by zero
  "__div": value1 => (value2 => {

    // int / float -> float
    if (typeof(value1) == 'bigint' && typeof(value2) == 'number') {
      return parseFloat(value1) / value2;
    }

    // float / int -> float
    if (typeof(value1) == 'number' && typeof(value2) == 'bigint') {
      return value1 / parseFloat(value2);
    }

    // float / float -> float
    if (typeof(value1) == 'number' && typeof(value2) == 'number') {
      return value1 / value2;
    }

    // int / int -> int
    if (typeof(value1) == 'bigint' && typeof(value2) == 'bigint') {
      return value1 / value2;
    }

    if (typeof(value1) != 'bigint' && typeof(value1) != 'number') {
      if (typeof(value2) == 'bigint' || typeof(value2) == 'number') {
        throw new NixEvalError(`value is ${nixTypeWithArticle(value1)} while ${nixTypeWithArticle(value2)} was expected`)
      }
      throw new NixEvalError(`value is ${nixTypeWithArticle(value1)} while an integer was expected`)
    }

    if (typeof(value2) != 'bigint' && typeof(value2) != 'number') {
      throw new NixEvalError(`value is ${nixTypeWithArticle(value2)} while ${nixTypeWithArticle(value1)} was expected`)
    }

  }),

  // TODO check types
  /*
  "__bitAnd": arg1 => (arg2 => arg1 & arg2),
  "__bitOr": arg1 => (arg2 => arg1 | arg2),
  "__bitXor": arg1 => (arg2 => arg1 ^ arg2),

  "__lessThan": arg1 => (arg2 => arg1 < arg2),
  */

  /*
  "__substring": arg => arg,
  "__stringLength": arg => arg,
  "__hashString": arg => arg,
  "__match": arg => arg,
  "__split": arg => arg,
  "__concatStringsSep": arg => arg,
  "__replaceStrings": arg => arg,
  "__parseDrvName": arg => arg,
  "__compareVersions": arg => arg,
  "__splitVersion": arg => arg,
  "__traceVerbose": arg => arg,
  */
};
