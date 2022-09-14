# nix-eval-js/doc/todo

## parser throws on long input

```
$ # 3389 ! + true
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3389 status=none | tr '\0' '!')true"
false

# 3389 ! + space + true
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3389 status=none | tr '\0' '!') true"
false

# 3389 ! + space + space + true
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3389 status=none | tr '\0' '!')  true"
Error: tree is empty

# 3390 !
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3390 status=none | tr '\0' '!')true"
Error: tree is empty
```
