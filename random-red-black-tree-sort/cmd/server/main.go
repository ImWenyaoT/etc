package main

import (
	tree "github.com/ImWenyaoT/etc/random-red-black-tree-sort"
	"github.com/ImWenyaoT/etc/random-red-black-tree-sort/internal/httpapi"
	"net/http"
)

func main() {
	m := http.NewServeMux()
	m.HandleFunc("POST /api/sort", func(w http.ResponseWriter, r *http.Request) {
		var b struct {
			Count int    `json:"count"`
			Seed  uint64 `json:"seed"`
		}
		if e := httpapi.Decode(w, r, &b); e != nil {
			httpapi.Error(w, 400, e)
			return
		}
		v, e := tree.Demo(b.Count, b.Seed)
		if e != nil {
			httpapi.Error(w, 400, e)
			return
		}
		httpapi.JSON(w, 200, v)
	})
	httpapi.Run(m, "127.0.0.1:18203")
}
