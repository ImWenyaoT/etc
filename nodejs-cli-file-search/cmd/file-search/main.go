package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	search "github.com/ImWenyaoT/etc/nodejs-cli-file-search"
)

func main() {
	if len(os.Args) == 1 {
		fmt.Println("file-search search <keyword> [--root directory] [--max number]")
		return
	}
	if len(os.Args) < 3 || os.Args[1] != "search" {
		fmt.Fprintln(os.Stderr, "expected search <keyword>")
		os.Exit(1)
	}
	f := flag.NewFlagSet("search", flag.ExitOnError)
	root := f.String("root", ".", "search directory")
	f.StringVar(root, "r", ".", "search directory")
	max := f.Int("max", 50, "maximum results")
	f.IntVar(max, "m", 50, "maximum results")
	f.Parse(os.Args[3:])
	if f.NArg() != 0 {
		fmt.Fprintln(os.Stderr, "unexpected arguments")
		os.Exit(1)
	}
	matches, e := search.Files(context.Background(), search.Options{Root: *root, Query: os.Args[2], Max: *max})
	if e != nil {
		fmt.Fprintln(os.Stderr, e)
		os.Exit(1)
	}
	for _, p := range matches {
		fmt.Println(p)
	}
}
