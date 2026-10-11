package main

import (
	"encoding/json"
	"flag"
	"fmt"
	parser "github.com/ImWenyaoT/etc/json-yaml-xml-parser"
	"os"
	"path/filepath"
)

func main() {
	if len(os.Args) == 1 || os.Args[1] == "--help" {
		fmt.Println("data-parser parse <file> [--format json|yaml|xml]")
		return
	}
	if len(os.Args) < 3 || os.Args[1] != "parse" {
		fmt.Fprintln(os.Stderr, "expected parse <file>")
		os.Exit(1)
	}
	f := flag.NewFlagSet("parse", flag.ExitOnError)
	format := f.String("format", "", "override format")
	f.StringVar(format, "f", "", "override format")
	f.Parse(os.Args[3:])
	if f.NArg() != 0 {
		fmt.Fprintln(os.Stderr, "unexpected arguments")
		os.Exit(1)
	}
	path, e := filepath.Abs(os.Args[2])
	if e == nil {
		var b []byte
		b, e = os.ReadFile(path)
		if e == nil {
			var result parser.Result
			result, e = parser.Parse(string(b), path, *format)
			if e == nil {
				enc := json.NewEncoder(os.Stdout)
				enc.SetIndent("", "  ")
				e = enc.Encode(result.Data)
			}
		}
	}
	if e != nil {
		fmt.Fprintln(os.Stderr, e)
		os.Exit(1)
	}
}
