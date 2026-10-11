package scores

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

type Score struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
}
type Store struct {
	mu    sync.Mutex
	file  string
	items []Score
}

func Open(file string) (*Store, error) {
	s := &Store{file: file, items: []Score{}}
	b, e := os.ReadFile(file)
	if e == nil {
		e = json.Unmarshal(b, &s.items)
	}
	if os.IsNotExist(e) {
		e = nil
	}
	return s, e
}
func (s *Store) List() []Score {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]Score{}, s.items...)
}
func (s *Store) Add(v Score) error {
	v.Name = strings.TrimSpace(v.Name)
	if v.Name == "" || len([]rune(v.Name)) > 40 || v.Score < 0 || v.Score > 5720 || v.Score%10 != 0 {
		return fmt.Errorf("昵称或得分有误，请检查。")
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
