package rbtree

import (
	"math/rand/v2"
	"testing"
)

func TestInvariants(t *testing.T) {
	for _, order := range [][]int{rand.Perm(10000), {1, 2, 3, 4, 5, 6}, {6, 5, 4, 3, 2, 1}} {
		tree := Tree{}
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
	r, e := Demo(10000, 42)
	if e != nil || !r.Valid || !r.Sorted || r.Inserted != 10000 || r.TreeHeight > 28 {
		t.Fatalf("%+v %v", r, e)
	}
	if _, e = Demo(-1, 1); e == nil {
		t.Fatal("negative count accepted")
	}
}
