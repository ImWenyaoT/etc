package search

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSearch(t *testing.T) {
	d := t.TempDir()
	for _, p := range []string{"B.txt", "a.TXT", "node_modules/hidden.txt", "nested/c.txt"} {
		p = filepath.Join(d, p)
		os.MkdirAll(filepath.Dir(p), 0700)
		os.WriteFile(p, []byte("x"), 0600)
	}
	os.Symlink(d, filepath.Join(d, "loop"))
	v, e := Files(Options{Root: d, Query: "TXT", Max: 2})
	if e != nil || len(v) != 2 || !strings.HasSuffix(v[0], "B.txt") {
		t.Fatalf("%v %v", v, e)
	}
	if _, e = Files(Options{Root: filepath.Join(d, "absent"), Query: "x", Max: 1}); e == nil {
		t.Fatal("missing root accepted")
	}
	if _, e = Files(Options{Root: d, Max: 0}); e == nil {
		t.Fatal("invalid max accepted")
	}
}
