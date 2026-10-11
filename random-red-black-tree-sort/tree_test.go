package rbtree_test

import (
	"math/rand/v2"
	"testing"

	rbtree "github.com/ImWenyaoT/etc/random-red-black-tree-sort"
)

func TestInvariants(t *testing.T) {
	for _, order := range [][]int{rand.Perm(10000), {1, 2, 3, 4, 5, 6}, {6, 5, 4, 3, 2, 1}} {
		tree := rbtree.Tree{}
		for _, v := range order {
			tree.Insert(v)
			if len(order) < 100 {
				if _, _, e := tree.Validate(); e != nil {
					t.Fatal(e)
				}
			}
		}
		if _, _, e := tree.Validate(); e != nil {
			t.Fatal(e)
		}
		if tree.Insert(order[0]) {
			t.Fatal("duplicate inserted")
		}
		a := tree.Values()
		for i := 1; i < len(a); i++ {
			if a[i-1] >= a[i] {
				t.Fatal("unsorted")
			}
		}
	}
}
func TestDemo(t *testing.T) {
	r, e := rbtree.Demo(10000, 42)
	if e != nil || !r.Valid || !r.Sorted || r.Inserted != 10000 || r.TreeHeight > 28 {
		t.Fatalf("%+v %v", r, e)
	}
	if _, e = rbtree.Demo(-1, 1); e == nil {
		t.Fatal("negative count accepted")
	}
}

func TestSnapshotsCannotChangeTree(t *testing.T) {
	var tree rbtree.Tree
	for _, value := range []int{3, 1, 2} {
		tree.Insert(value)
	}
	original := tree.Stats()
	stats := tree.Stats()
	stats.Insertions = 999
	stats.Rotations = 999
	values := tree.Values()
	values[0] = 999
	if tree.Stats() != original || tree.Values()[0] != 1 {
		t.Fatal("caller mutated tree through a snapshot")
	}
	if tree.Insert(2) || tree.Stats().Insertions != original.Insertions {
		t.Fatal("duplicate changed insertion count")
	}
}
