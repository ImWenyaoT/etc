package main

import (
	"github.com/ImWenyaoT/etc/web-front-end-snake-game/internal/httpapi"
	"github.com/ImWenyaoT/etc/web-front-end-snake-game/internal/scores"
	"net/http"
	"os"
)

func main() {
	file := os.Getenv("SCORES_FILE")
	if file == "" {
		file = "data/scores.json"
	}
	s, e := scores.Open(file)
	if e != nil {
		panic(e)
	}
	m := http.NewServeMux()
	m.HandleFunc("GET /api/scores", func(w http.ResponseWriter, r *http.Request) { httpapi.JSON(w, 200, map[string]any{"items": s.List()}) })
	m.HandleFunc("POST /api/scores", func(w http.ResponseWriter, r *http.Request) {
		var v scores.Score
		if e := httpapi.Decode(w, r, &v); e != nil {
			httpapi.Error(w, 400, e)
			return
		}
		if e := s.Add(v); e != nil {
			httpapi.Error(w, 400, e)
			return
		}
		httpapi.JSON(w, 201, v)
	})
	httpapi.Run(m, "127.0.0.1:18204")
}
