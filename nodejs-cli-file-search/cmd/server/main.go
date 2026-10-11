package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	search "github.com/ImWenyaoT/etc/nodejs-cli-file-search"
	"github.com/ImWenyaoT/etc/nodejs-cli-file-search/internal/httpapi"
)

func main() {
	root := os.Getenv("SEARCH_ROOT")
	if root == "" {
		root = "."
	}
	root, e := filepath.EvalSymlinks(root)
	if e != nil {
		panic(e)
	}
	root, e = filepath.Abs(root)
	if e != nil {
		panic(e)
	}
	m := http.NewServeMux()
	m.HandleFunc("POST /api/search", func(w http.ResponseWriter, r *http.Request) {
		var b struct {
			Query string `json:"query"`
			Max   int    `json:"max"`
		}
		if e := httpapi.Decode(w, r, &b); e != nil {
			httpapi.Error(w, 400, e)
			return
		}
		if b.Max < 1 || b.Max > 1000 {
			httpapi.Error(w, 400, fmt.Errorf("max must be between 1 and 1000"))
			return
		}
		items, e := search.Files(r.Context(), search.Options{Root: root, Query: b.Query, Max: b.Max})
		if e != nil {
			httpapi.Error(w, 400, e)
			return
		}
		for i, p := range items {
			items[i], _ = filepath.Rel(root, p)
		}
		httpapi.JSON(w, 200, map[string]any{"items": items})
	})
	httpapi.Run(m, "127.0.0.1:18201")
}
