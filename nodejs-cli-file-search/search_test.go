package search_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	search "github.com/ImWenyaoT/etc/nodejs-cli-file-search"
)

func TestSearch(t *testing.T) {
	d := t.TempDir()
	for _, p := range []string{"B.txt", "a.TXT", "node_modules/hidden.txt", "nested/c.txt"} {
		p = filepath.Join(d, p)
		os.MkdirAll(filepath.Dir(p), 0700)
		os.WriteFile(p, []byte("x"), 0600)
	}
	os.Symlink(d, filepath.Join(d, "loop"))
	v, e := search.Files(context.Background(), search.Options{Root: d, Query: "TXT", Max: 2})
	if e != nil || len(v) != 2 || !strings.HasSuffix(v[0], "B.txt") {
		t.Fatalf("%v %v", v, e)
	}
	if _, e = search.Files(context.Background(), search.Options{Root: filepath.Join(d, "absent"), Query: "x", Max: 1}); e == nil {
		t.Fatal("missing root accepted")
	}
	if _, e = search.Files(context.Background(), search.Options{Root: d, Max: 0}); e == nil {
		t.Fatal("invalid max accepted")
	}
}

func TestCanceledSearchReturnsNoResults(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	result, err := search.Files(ctx, search.Options{Root: t.TempDir(), Query: "x", Max: 10})
	if !errors.Is(err, context.Canceled) || result != nil {
		t.Fatalf("results=%v err=%v", result, err)
	}
}
func TestUnreadableSubdirectoryDoesNotLookComplete(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "a.txt"), []byte("x"), 0600); err != nil {
		t.Fatal(err)
	}
	blocked := filepath.Join(root, "blocked")
	if err := os.Mkdir(blocked, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(blocked, 0000); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(blocked, 0700) })
	if _, err := os.ReadDir(blocked); err == nil {
		t.Skip("process can read permission-restricted directories")
	}
	results, err := search.Files(context.Background(), search.Options{Root: root, Query: "txt", Max: 10})
	if !errors.Is(err, search.ErrIncomplete) || !errors.Is(err, os.ErrPermission) || results != nil {
		t.Fatalf("partial search reported as complete: results=%v error=%v", results, err)
	}
}
