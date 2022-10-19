# callPackage

https://nixos.org/guides/nix-pills/callpackage-design-pattern.html

## builtins.functionArgs

```
nix-repl> add = { a ? 3, b }: a+b

nix-repl> builtins.functionArgs add
{ a = true; b = false; }
```

## builtins.intersectAttrs

```
nix-repl> values = { a = 3; b = 5; c = 10; }

nix-repl> builtins.intersectAttrs values (builtins.functionArgs add)
{ a = true; b = false; }

nix-repl> builtins.intersectAttrs (builtins.functionArgs add) values
{ a = 3; b = 5; }
```


## 

https://discourse.nixos.org/t/where-is-callpackage-defined-exactly-part-2/12524
