#! /bin/sh

# what would nix do?

nix-instantiate --parse --expr -- "$1"
