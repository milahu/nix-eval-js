# database software

views on tables

synchronization

caching

"Nix is a database query language"

## query-intensive applications

few writes, many reads

### MonetDB

https://github.com/MonetDB/MonetDB

> The MonetDB database system is a high-performance database kernel for query-intensive applications

via https://wiki.openstreetmap.org/wiki/MonetDB

## simple graph database

### jseg

https://github.com/brandonbloom/jseg

A super simple, in-memory, JS graph database.

## graph database

aka NoSQL

https://db-engines.com/en/article/Graph+DBMS

> Graph DBMS, also called graph-oriented DBMS or graph database, represent data in graph structures as nodes and edges, which are relationships between nodes. They allow easy processing of data in that form, and simple calculation of specific properties of the graph, such as the number of steps needed to get from one node to another node.

https://en.wikipedia.org/wiki/Graph_database

https://github.com/topics/graph-database

wanted specs

* written in [Rust](https://github.com/topics/graph-database?l=rust)

### surrealdb

https://github.com/surrealdb/surrealdb

Rust

### indradb

https://github.com/indradb/indradb

Rust

### oxigraph

https://github.com/oxigraph/oxigraph

Rust

### arangodb

https://github.com/arangodb/arangodb

C++

### nebula

https://github.com/vesoft-inc/nebula

C++

### Dgraph

18K github stars

https://github.com/dgraph-io/dgraph

https://dgraph.io/

https://db-engines.com/en/system/Dgraph

* written in Go == meh, GC sucks, better than Java

### Neo4j

https://en.wikipedia.org/wiki/Neo4j

https://db-engines.com/en/system/Neo4j

* 10K github stars
* written in Java == meh
* many language bindings: Java, .NET, JavaScript, Python, Go, Ruby, PHP, R, Erlang/Elixir, C/C++, Clojure, Perl, Haskell
* Open-source, supports ACID, has high-availability clustering for enterprise deployments, and comes with a web-based administration that includes full transaction support and visual node-link graph explorer; accessible from most programming languages using its built-in REST web API interface, and a proprietary Bolt protocol with official drivers.
