# import

https://nixos.org/guides/nix-pills/functions-and-imports.html#idm140737320444768

> The import function is built-in and provides a way to parse a .nix file.

`nixpkgs/default.nix`

```nix
let requiredVersion = import ./lib/minver.nix; in

if ! builtins ? nixVersion || builtins.compareVersions requiredVersion builtins.nixVersion == 1 then

  abort ''

    ...
```
