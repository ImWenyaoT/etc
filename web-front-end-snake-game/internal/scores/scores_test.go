package scores_test

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"testing"

	scores "github.com/ImWenyaoT/etc/web-front-end-snake-game/internal/scores"
)

func TestPersistence(t *testing.T) {
	p := filepath.Join(t.TempDir(), "scores.json")
	s, e := scores.Open(p)
	if e != nil {
		t.Fatal(e)
	}
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Go(func() {
			if e := s.Add(scores.Score{"Ada", 10}); e != nil {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	s, e = scores.Open(p)
	if e != nil || len(s.List()) != 20 {
		t.Fatalf("%v %v", s, e)
	}
	if e = s.Add(scores.Score{"", -1}); e == nil {
		t.Fatal("invalid score accepted")
	}
}

func TestFailedSaveKeepsLastSuccessfulState(t *testing.T) {
	file := filepath.Join(t.TempDir(), "scores.json")
	store, err := scores.Open(file)
	if err != nil {
		t.Fatal(err)
	}
	if err = store.Add(scores.Score{Name: "Ada", Score: 10}); err != nil {
		t.Fatal(err)
	}
	expected := store.List()
	backup := file + ".backup"
	if err = os.Rename(file, backup); err != nil {
		t.Fatal(err)
	}
	if err = os.Mkdir(file, 0700); err != nil {
		t.Fatal(err)
	}
	// A directory at the destination makes atomic replacement fail, without mocks.
	if err = store.Add(scores.Score{Name: "Bob", Score: 20}); err == nil {
		t.Fatal("failed replacement accepted")
	}
	if !reflect.DeepEqual(store.List(), expected) {
		t.Fatal("failed save changed memory")
	}
	if err = os.Remove(file); err != nil {
		t.Fatal(err)
	}
	if err = os.Rename(backup, file); err != nil {
		t.Fatal(err)
	}
	reopened, err := scores.Open(file)
	if err != nil || !reflect.DeepEqual(reopened.List(), expected) {
		t.Fatalf("%v %v", reopened, err)
	}
	leftovers, err := filepath.Glob(filepath.Join(filepath.Dir(file), ".scores-*"))
	if err != nil || len(leftovers) != 0 {
		t.Fatalf("temporary files leaked: %v %v", leftovers, err)
	}
}
func TestListIsACopyAndCorruptionIsRejected(t *testing.T) {
	file := filepath.Join(t.TempDir(), "scores.json")
	store, err := scores.Open(file)
	if err != nil {
		t.Fatal(err)
	}
	if err = store.Add(scores.Score{Name: " Ada ", Score: 10}); err != nil {
		t.Fatal(err)
	}
	copy := store.List()
	copy[0].Name = "Changed"
	if store.List()[0].Name != "Ada" {
		t.Fatal("caller mutated store")
	}
	corrupt := []byte("not json")
	if err = os.WriteFile(file, corrupt, 0600); err != nil {
		t.Fatal(err)
	}
	if reopened, err := scores.Open(file); err == nil || reopened != nil {
		t.Fatal("corruption accepted")
	}
	actual, err := os.ReadFile(file)
	if err != nil || string(actual) != string(corrupt) {
		t.Fatal("corrupt file overwritten")
	}
}
func TestTopScoresAndTieOrder(t *testing.T) {
	file := filepath.Join(t.TempDir(), "scores.json")
	store, err := scores.Open(file)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 101; i++ {
		if err = store.Add(scores.Score{Name: "Player", Score: i * 10}); err != nil {
			t.Fatal(err)
		}
	}
	items := store.List()
	if len(items) != 100 || items[0].Score != 1000 || items[99].Score != 10 {
		t.Fatal("top 100 ordering changed")
	}
	if err = store.Add(scores.Score{Name: "First", Score: 1100}); err != nil {
		t.Fatal(err)
	}
	if err = store.Add(scores.Score{Name: "Second", Score: 1100}); err != nil {
		t.Fatal(err)
	}
	if items = store.List(); items[0].Name != "First" || items[1].Name != "Second" {
		t.Fatal("ties reordered")
	}
}

func TestScoreValidationDoesNotChangeSavedState(t *testing.T) {
	file := filepath.Join(t.TempDir(), "scores.json")
	store, err := scores.Open(file)
	if err != nil {
		t.Fatal(err)
	}
	for _, value := range []scores.Score{{Name: "", Score: 10}, {Name: strings.Repeat("字", 41), Score: 10}, {Name: "Ada", Score: -10}, {Name: "Ada", Score: 11}, {Name: "Ada", Score: 5730}} {
		if err = store.Add(value); err == nil {
			t.Fatalf("invalid score accepted: %+v", value)
		}
	}
	if len(store.List()) != 0 {
		t.Fatal("invalid input changed state")
	}
	if err = store.Add(scores.Score{Name: strings.Repeat("字", 40), Score: 5720}); err != nil {
		t.Fatal(err)
	}
	reopened, err := scores.Open(file)
	if err != nil || len(reopened.List()) != 1 {
		t.Fatalf("boundary score not persisted: %v", err)
	}
}
