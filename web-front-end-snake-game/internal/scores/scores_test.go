package scores

import (
	"path/filepath"
	"sync"
	"testing"
)

func TestPersistence(t *testing.T) {
	p := filepath.Join(t.TempDir(), "scores.json")
	s, e := Open(p)
	if e != nil {
		t.Fatal(e)
	}
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Go(func() {
			if e := s.Add(Score{"Ada", 10}); e != nil {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	s, e = Open(p)
	if e != nil || len(s.List()) != 20 {
		t.Fatalf("%v %v", s, e)
	}
	if e = s.Add(Score{"", -1}); e == nil {
		t.Fatal("invalid score accepted")
	}
}
