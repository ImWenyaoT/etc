// Package scores stores the best 100 submitted scores in a single JSON file.
package scores

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

// Score is a nonblank name of up to 40 runes and a multiple of ten from 0 to 5720.
type Score struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
}

// Store serializes concurrent calls within one process. Only one Store/process
// may own a file; it does not provide cross-process locking or cheat detection.
type Store struct {
	mu    sync.Mutex
	file  string
	items []Score
}

// Open loads existing scores; a missing file starts an empty store. Invalid JSON
// is an error and is never overwritten automatically.
func Open(file string) (*Store, error) {
	s := &Store{file: file, items: []Score{}}
	b, e := os.ReadFile(file)
	if e == nil {
		e = json.Unmarshal(b, &s.items)
	}
	if os.IsNotExist(e) {
		e = nil
	}
	if e != nil {
		return nil, fmt.Errorf("load scores: %w", e)
	}
	return s, nil
}

// List returns a copy; callers cannot mutate stored scores through it.
func (s *Store) List() []Score {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]Score{}, s.items...)
}

// Add trims the name, validates the score, and atomically replaces the file.
// Equal scores preserve submission order. Memory changes only after the write
// succeeds; failures leave the previous scores intact. The parent directory is
// not fsynced, so this is atomic replacement, not a power-loss durability promise.
func (s *Store) Add(v Score) error {
	v.Name = strings.TrimSpace(v.Name)
	if v.Name == "" || len([]rune(v.Name)) > 40 || v.Score < 0 || v.Score > 5720 || v.Score%10 != 0 {
		return errors.New("昵称或得分有误，请检查。")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	items := append(append([]Score{}, s.items...), v)
	sort.SliceStable(items, func(i, j int) bool { return items[i].Score > items[j].Score })
	if len(items) > 100 {
		items = items[:100]
	}
	b, e := json.Marshal(items)
	if e != nil {
		return e
	}
	if e = os.MkdirAll(filepath.Dir(s.file), 0700); e != nil {
		return e
	}
	f, e := os.CreateTemp(filepath.Dir(s.file), ".scores-*")
	if e != nil {
		return e
	}
	defer os.Remove(f.Name())
	if _, e = f.Write(b); e == nil {
		e = f.Sync()
	}
	ce := f.Close()
	if e == nil {
		e = ce
	}
	if e == nil {
		e = os.Rename(f.Name(), s.file)
	}
	if e == nil {
		s.items = items
	}
	return e
}
