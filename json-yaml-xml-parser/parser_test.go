package parser

import (
	"encoding/json"
	"testing"
)

func TestParse(t *testing.T) {
	for _, c := range []struct{ f, s, want string }{{"json", `{"ok":true}`, `{"ok":true}`}, {"yaml", "name: Ada\nitems: [1, 2]", `{"items":[1,2],"name":"Ada"}`}, {"xml", `<tags id="1"><tag>a</tag><tag>b</tag></tags>`, `{"tags":{"$attributes":{"id":"1"},"tag":[{"$text":"a"},{"$text":"b"}]}}`}} {
		r, e := Parse(c.s, "", c.f)
		b, _ := json.Marshal(r.Data)
		if e != nil || string(b) != c.want {
			t.Fatalf("%s: %s %v", c.f, b, e)
		}
	}
	for _, c := range []struct{ f, s string }{{"json", "{"}, {"yaml", "a: ["}, {"xml", "<a><b></a>"}, {"xml", "<a/><b/>"}, {"xml", ""}, {"yaml", "a: 1\n---\nb: 2"}, {"toml", "x"}} {
		if _, e := Parse(c.s, "", c.f); e == nil {
			t.Fatalf("accepted %v", c)
		}
	}
}
