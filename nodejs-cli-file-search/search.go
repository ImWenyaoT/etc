package search

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

type Options struct {
	Root    string
	Query   string
	Max     int
	Ignored []string
}

func Files(o Options) ([]string, error) {
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
		if e != nil {
			if p == root {
				return e
			}
			return nil
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
	return result, e
}
