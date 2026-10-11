package main

import (
	"encoding/json"
	"flag"
	"fmt"
	tree "github.com/ImWenyaoT/etc/random-red-black-tree-sort"
	"os"
)

func main() {
	count := flag.Int("count", 10000, "element count")
	seed := flag.Uint64("seed", 42, "random seed")
	flag.Parse()
	r, e := tree.Demo(*count, *seed)
	if e != nil {
		fmt.Fprintln(os.Stderr, e)
		os.Exit(1)
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if e = enc.Encode(r); e != nil {
		fmt.Fprintln(os.Stderr, e)
		os.Exit(1)
	}
}
