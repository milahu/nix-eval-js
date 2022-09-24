/*
cat nix/src/libexpr/primops.cc | grep '.name = "__' | cut -d'"' -f2 | sed -E 's/^(.*)$/  "\1": arg => arg,/'
*/

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

  "__elemAt": list => (index => list[index]),
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

  "__add": arg => arg,
  "__sub": arg => arg,
  "__mul": arg => arg,
  "__div": arg => arg,

  "__bitAnd": arg => arg,
  "__bitOr": arg => arg,
  "__bitXor": arg => arg,

  "__lessThan": arg => arg,

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
