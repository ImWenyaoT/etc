// Package search finds regular files by name without following symbolic links.
package search

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// Options configures a case-insensitive substring search. Nil Ignored uses the
// default directory exclusions; an empty slice disables those exclusions.
type Options struct {
	Root    string
	Query   string
	Max     int
	Ignored []string
}

// ErrIncomplete reports a traversal failure. Results are discarded rather than
// silently presenting an incomplete search as successful.
var ErrIncomplete = errors.New("search incomplete")

// Files returns absolute paths in lexical directory traversal order, stopping at
// Max matches. An empty query returns an empty slice. It returns no results on
// cancellation or a traversal failure; inspect errors.Is(err, ErrIncomplete).
func Files(ctx context.Context, o Options) ([]string, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	root, e := filepath.Abs(o.Root)
	if e != nil {
		return nil, e
	}
	info, e := os.Stat(root)
	if e != nil {
		return nil, e
	}
	if !info.IsDir() {
		return nil, errors.New("root must be a directory")
	}
	if o.Max < 1 {
		return nil, errors.New("max must be positive")
	}
	result := []string{}
	q := strings.ToLower(strings.TrimSpace(o.Query))
	if q == "" {
		return result, nil
	}
	ignored := map[string]bool{}
	if o.Ignored == nil {
		o.Ignored = []string{".git", "node_modules", "dist", "coverage"}
	}
	for _, s := range o.Ignored {
		ignored[s] = true
	}
	e = filepath.WalkDir(root, func(p string, d fs.DirEntry, e error) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if e != nil {
			return fmt.Errorf("%w: %w", ErrIncomplete, e)
		}
		if d.IsDir() {
			if p != root && ignored[d.Name()] {
				return filepath.SkipDir
			}
			return nil
		}
		if d.Type().IsRegular() && strings.Contains(strings.ToLower(d.Name()), q) {
			result = append(result, p)
			if len(result) >= o.Max {
				return fs.SkipAll
			}
		}
		return nil
	})
	if e != nil {
		return nil, e
	}
	return result, nil
}
