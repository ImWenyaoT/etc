package main

import (
	parser "github.com/ImWenyaoT/etc/json-yaml-xml-parser"
	"github.com/ImWenyaoT/etc/json-yaml-xml-parser/internal/httpapi"
	"net/http"
)

func main() {
	m := http.NewServeMux()
	m.HandleFunc("POST /api/parse", func(w http.ResponseWriter, r *http.Request) {
		var b struct {
			Source string `json:"source"`
			Format string `json:"format"`
		}
		if e := httpapi.Decode(w, r, &b); e != nil {
			httpapi.Error(w, 400, e)
			return
		}
		v, e := parser.Parse(b.Source, "", b.Format)
		if e != nil {
			httpapi.Error(w, 400, e)
			return
		}
		httpapi.JSON(w, 200, v)
	})
	httpapi.Run(m, "127.0.0.1:18202")
}
