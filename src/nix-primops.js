// Nix primary operations

import { NixEvalError } from "./nix-errors.js"
import { printNode } from "./nix-thunks.js"



// cat primops.cc | grep '.name = "__' | cut -d'"' -f2 | sed -E 's/^(.*)$/  "\1": node => TodoPrimOp(node, "\1"),/'

function TodoPrimOp(node, opName) {
    printNode(node, `setThunk.${opName} # TODO implement`);
    node.thunk = () => {
      printNode(node, `${opName}.thunk # TODO implement`);

      // function with 1 argument
      // TODO function
      return (arg) => (arg); // identity function

      // function with 2 arguments
      // partial TODO function
      return (arg1) => {
        // TODO function
        return (arg2) => (arg1 + arg2); // add function
      };
    }
}



export const NixPrimOps = {

  "__typeOf": node => {
    //printNode(node, "setThunk.__typeOf");
    node.thunk = () => {
      //printNode(node, "__typeOf.thunk");
        return (arg) => {
          const javascriptType = typeof(arg);
          if (javascriptType == 'number') { // int or float?
            if ((arg | 0) == arg) return 'int';
            return 'float';
          }
          if (arg === null) return 'null'; // js: typeof(null) == 'object'
          if (arg === true || arg === false) return 'bool';
          if (Symbol.iterator in arg) return 'list';
          if (arg instanceof Object) return 'set'; // AttrSet
          // TODO handle more cases?
          return javascriptType; // string
        };
    }
  },

  "__isFunction": node => TodoPrimOp(node, "__isFunction"),
  "__isInt": node => TodoPrimOp(node, "__isInt"),
  "__isFloat": node => TodoPrimOp(node, "__isFloat"),
  "__isString": node => TodoPrimOp(node, "__isString"),
  "__isBool": node => TodoPrimOp(node, "__isBool"),
  "__isPath": node => TodoPrimOp(node, "__isPath"),
  "__genericClosure": node => TodoPrimOp(node, "__genericClosure"),
  "__addErrorContext": node => TodoPrimOp(node, "__addErrorContext"),
  "__ceil": node => TodoPrimOp(node, "__ceil"),
  "__floor": node => TodoPrimOp(node, "__floor"),
  "__tryEval": node => TodoPrimOp(node, "__tryEval"),
  "__getEnv": node => TodoPrimOp(node, "__getEnv"),
  "__seq": node => TodoPrimOp(node, "__seq"),
  "__deepSeq": node => TodoPrimOp(node, "__deepSeq"),
  "__trace": node => TodoPrimOp(node, "__trace"),
  "__toPath": node => TodoPrimOp(node, "__toPath"),
  "__storePath": node => TodoPrimOp(node, "__storePath"),
  "__pathExists": node => TodoPrimOp(node, "__pathExists"),
  "__readFile": node => TodoPrimOp(node, "__readFile"),
  "__findFile": node => TodoPrimOp(node, "__findFile"),
  "__hashFile": node => TodoPrimOp(node, "__hashFile"),
  "__readDir": node => TodoPrimOp(node, "__readDir"),
  "__toXML": node => TodoPrimOp(node, "__toXML"),
  "__toJSON": node => TodoPrimOp(node, "__toJSON"),
  "__fromJSON": node => TodoPrimOp(node, "__fromJSON"),
  "__toFile": node => TodoPrimOp(node, "__toFile"),
  "__filterSource": node => TodoPrimOp(node, "__filterSource"),
  "__path": node => TodoPrimOp(node, "__path"),
  "__attrNames": node => TodoPrimOp(node, "__attrNames"),
  "__attrValues": node => TodoPrimOp(node, "__attrValues"),
  "__getAttr": node => TodoPrimOp(node, "__getAttr"),
  "__unsafeGetAttrPos": node => TodoPrimOp(node, "__unsafeGetAttrPos"),
  "__hasAttr": node => TodoPrimOp(node, "__hasAttr"),
  "__isAttrs": node => TodoPrimOp(node, "__isAttrs"),
  "__listToAttrs": node => TodoPrimOp(node, "__listToAttrs"),
  "__intersectAttrs": node => TodoPrimOp(node, "__intersectAttrs"),
  "__catAttrs": node => TodoPrimOp(node, "__catAttrs"),
  "__functionArgs": node => TodoPrimOp(node, "__functionArgs"),
  "__mapAttrs": node => TodoPrimOp(node, "__mapAttrs"),
  "__zipAttrsWith": node => TodoPrimOp(node, "__zipAttrsWith"),
  "__isList": node => TodoPrimOp(node, "__isList"),
  "__elemAt": node => {
    //printNode(node, "setThunk.__elemAt");
    node.thunk = () => {
      //printNode(node, "__elemAt.thunk");
      // partial elemAt function
      return (arg1 /** @type list */) => {
        // elemAt function
        return (arg2 /** @type index */) => {
          // nix-repl> __elemAt [1] (-1)
          // error: list index -1 is out of bounds
          if (arg2 < 0) throw new NixEvalError(`list index ${arg2} is out of bounds`);
          let i = 0;
          for (const value of arg1) {
            if (i == arg2) return value;
            i++;
          }
          // nix-repl> __elemAt [1] 1
          // error: list index 1 is out of bounds
          throw new NixEvalError(`list index ${arg2} is out of bounds`);
        };
      };
    }
  },
  "__head": node => {
    //printNode(node, "setThunk.__head");
    node.thunk = () => {
      //printNode(node, "__head.thunk");
        return (arg) => {
          for (const value of arg) {
            return value; // stop loop after first value
          }
        };
    }
  },
  "__tail": node => {
    //printNode(node, "setThunk.__tail");
    node.thunk = () => {
      //printNode(node, "__tail.thunk");
        return (arg) => {
          let value;
          for (value of arg) { }
          return value;
        };
    }
  },
  "__filter": node => TodoPrimOp(node, "__filter"),
  "__elem": node => TodoPrimOp(node, "__elem"),
  "__concatLists": node => TodoPrimOp(node, "__concatLists"),
  "__length": node => TodoPrimOp(node, "__length"),
  "__foldl'": node => TodoPrimOp(node, "__foldl'"),
  "__any": node => TodoPrimOp(node, "__any"),
  "__all": node => TodoPrimOp(node, "__all"),
  "__genList": node => TodoPrimOp(node, "__genList"),
  "__sort": node => TodoPrimOp(node, "__sort"),
  "__partition": node => TodoPrimOp(node, "__partition"),
  "__groupBy": node => TodoPrimOp(node, "__groupBy"),
  "__concatMap": node => TodoPrimOp(node, "__concatMap"),
  "__add": node => {
    //printNode(node, "setThunk.__add");
    node.thunk = () => {
      //printNode(node, "__add.thunk");
      // partial add function
      return (arg1) => {
        // add function
        return (arg2) => (arg1 + arg2);
      };
    }
  },
  "__sub": node => {
    node.thunk = () => {
      // partial sub function
      return (arg1) => {
        // sub function
        return (arg2) => (arg1 - arg2);
      };
    }
  },
  "__mul": node => {
    node.thunk = () => {
      // partial mul function
      return (arg1) => {
        // mul function
        return (arg2) => (arg1 * arg2);
      };
    }
  },
  "__div": node => {
    node.thunk = () => {
      // partial div function
      return (arg1) => {
        // div function
        return (arg2) => (arg1 / arg2);
      };
    }
  },
  "__bitAnd": node => TodoPrimOp(node, "__bitAnd"),
  "__bitOr": node => TodoPrimOp(node, "__bitOr"),
  "__bitXor": node => TodoPrimOp(node, "__bitXor"),
  "__lessThan": node => TodoPrimOp(node, "__lessThan"),
  "__substring": node => TodoPrimOp(node, "__substring"),
  "__stringLength": node => TodoPrimOp(node, "__stringLength"),
  "__hashString": node => TodoPrimOp(node, "__hashString"),
  "__match": node => TodoPrimOp(node, "__match"),
  "__split": node => TodoPrimOp(node, "__split"),
  "__concatStringsSep": node => TodoPrimOp(node, "__concatStringsSep"),
  "__replaceStrings": node => TodoPrimOp(node, "__replaceStrings"),
  "__parseDrvName": node => TodoPrimOp(node, "__parseDrvName"),
  "__compareVersions": node => TodoPrimOp(node, "__compareVersions"),
  "__splitVersion": node => TodoPrimOp(node, "__splitVersion"),
  "__traceVerbose": node => TodoPrimOp(node, "__traceVerbose"),

};
