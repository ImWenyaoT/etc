package rbtree

import (
	"fmt"
	"math/rand/v2"
	"time"
)

type node struct {
	value       int
	red         bool
	left, right *node
}
type Tree struct {
	root       *node
	Insertions int
	Rotations  int
	Recolors   int
}

func red(n *node) bool { return n != nil && n.red }
func (t *Tree) rotateLeft(h *node) *node {
	x := h.right
	h.right = x.left
	x.left = h
	x.red = h.red
	h.red = true
	t.Rotations++
	return x
}
func (t *Tree) rotateRight(h *node) *node {
	x := h.left
	h.left = x.right
	x.right = h
	x.red = h.red
	h.red = true
	t.Rotations++
	return x
}
func (t *Tree) insert(h *node, v int) (*node, bool) {
	if h == nil {
		return &node{value: v, red: true}, true
	}
	var added bool
	if v < h.value {
		h.left, added = t.insert(h.left, v)
	} else if v > h.value {
		h.right, added = t.insert(h.right, v)
	} else {
		return h, false
	}
	if red(h.right) && !red(h.left) {
		h = t.rotateLeft(h)
	}
	if red(h.left) && red(h.left.left) {
		h = t.rotateRight(h)
	}
	if red(h.left) && red(h.right) {
		h.red = !h.red
		h.left.red = !h.left.red
		h.right.red = !h.right.red
		t.Recolors += 3
	}
	return h, added
}

// Insert stores unique values. Duplicate insertions are a no-op.
func (t *Tree) Insert(v int) bool {
	var added bool
	t.root, added = t.insert(t.root, v)
	if red(t.root) {
		t.root.red = false
		t.Recolors++
	}
	if added {
		t.Insertions++
	}
	return added
}
func (t *Tree) Values() []int {
	values := []int{}
	var walk func(*node)
	walk = func(n *node) {
		if n == nil {
			return
		}
		walk(n.left)
		values = append(values, n.value)
		walk(n.right)
	}
	walk(t.root)
	return values
}
func (t *Tree) Validate() (int, int, error) {
	if red(t.root) {
		return 0, 0, fmt.Errorf("root is red")
	}
	var check func(*node, *int, *int) (int, int, error)
	check = func(n *node, lo, hi *int) (int, int, error) {
		if n == nil {
			return 1, 0, nil
		}
		if lo != nil && n.value <= *lo || hi != nil && n.value >= *hi {
			return 0, 0, fmt.Errorf("invalid ordering")
		}
		if red(n) && (red(n.left) || red(n.right)) {
			return 0, 0, fmt.Errorf("consecutive red nodes")
		}
		lb, lh, e := check(n.left, lo, &n.value)
		if e != nil {
			return 0, 0, e
		}
		rb, rh, e := check(n.right, &n.value, hi)
		if e != nil {
			return 0, 0, e
		}
		if lb != rb {
			return 0, 0, fmt.Errorf("unequal black heights")
		}
		if !red(n) {
			lb++
		}
		return lb, 1 + max(lh, rh), nil
	}
	return check(t.root, nil, nil)
}

type Result struct {
	ElementCount    int      `json:"elementCount"`
	Inserted        int      `json:"inserted"`
	InsertTimeMs    float64  `json:"insertTimeMs"`
	TraversalTimeMs float64  `json:"traversalTimeMs"`
	TreeHeight      int      `json:"treeHeight"`
	Rotations       int      `json:"rotations"`
	Recolors        int      `json:"recolors"`
	Valid           bool     `json:"validRedBlackTree"`
	BlackHeight     int      `json:"blackHeight"`
	Sorted          bool     `json:"sortedOutput"`
	First           []int    `json:"firstValues"`
	Last            []int    `json:"lastValues"`
	Errors          []string `json:"validationErrors"`
}

func Demo(count int, seed uint64) (Result, error) {
	if count < 1 || count > 1000000 {
		return Result{}, fmt.Errorf("count must be between 1 and 1000000")
	}
	rng := rand.New(rand.NewPCG(seed, seed^0x9e3779b97f4a7c15))
	order := rng.Perm(count)
	tree := Tree{}
	start := time.Now()
	for _, v := range order {
		tree.Insert(v)
	}
	insert := float64(time.Since(start).Nanoseconds()) / 1e6
	start = time.Now()
	values := tree.Values()
	traverse := float64(time.Since(start).Nanoseconds()) / 1e6
	bh, height, e := tree.Validate()
	errs := []string{}
	if e != nil {
		errs = append(errs, e.Error())
	}
	sorted := true
	for i := 1; i < len(values); i++ {
		if values[i-1] >= values[i] {
			sorted = false
		}
	}
	n := min(10, count)
	return Result{count, tree.Insertions, insert, traverse, height, tree.Rotations, tree.Recolors, e == nil, bh, sorted, values[:n], values[count-n:], errs}, nil
}
