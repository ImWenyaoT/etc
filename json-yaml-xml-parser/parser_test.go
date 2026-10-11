package parser_test

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"

	parser "github.com/ImWenyaoT/etc/json-yaml-xml-parser"
)

func TestParse(t *testing.T) {
	for _, c := range []struct{ f, s, want string }{{"json", `{"ok":true}`, `{"ok":true}`}, {"yaml", "name: Ada\nitems: [1, 2]", `{"items":[1,2],"name":"Ada"}`}, {"xml", `<tags id="1"><tag>a</tag><tag>b</tag></tags>`, `{"tags":{"$attributes":{"id":"1"},"tag":[{"$text":"a"},{"$text":"b"}]}}`}} {
		r, e := parser.Parse(c.s, "", c.f)
		b, _ := json.Marshal(r.Data)
		if e != nil || string(b) != c.want {
			t.Fatalf("%s: %s %v", c.f, b, e)
		}
	}
	for _, c := range []struct{ f, s string }{{"json", "{"}, {"yaml", "a: ["}, {"xml", "<a><b></a>"}, {"xml", "<a/><b/>"}, {"xml", ""}, {"yaml", "a: 1\n---\nb: 2"}, {"toml", "x"}} {
		if _, e := parser.Parse(c.s, "", c.f); e == nil {
			t.Fatalf("accepted %v", c)
		}
	}
}

func TestErrorClassification(t *testing.T) {
	for _, c := range []struct {
		source, format string
		want           error
	}{
		{"x", "toml", parser.ErrUnsupportedFormat}, {"{", "json", parser.ErrInvalidDocument},
		{"a: [", "yaml", parser.ErrInvalidDocument}, {"<a><b></a>", "xml", parser.ErrInvalidDocument},
	} {
		_, err := parser.Parse(c.source, "", c.format)
		if !errors.Is(err, c.want) {
			t.Fatalf("format %s: %v", c.format, err)
		}
	}
}
func TestFormatDetectionAndEmptyYAML(t *testing.T) {
	result, err := parser.Parse("name: Ada", "example.YML", "")
	if err != nil || result.Format != "yaml" || result.SourcePath != "example.YML" {
		t.Fatalf("%+v %v", result, err)
	}
	result, err = parser.Parse("", "", "yaml")
	if err != nil || result.Data != nil {
		t.Fatalf("empty YAML: %+v %v", result, err)
	}
}

func TestXMLLimitsAndUnderlyingJSONError(t *testing.T) {
	atLimit := strings.Repeat("<a>", 256) + strings.Repeat("</a>", 256)
	if _, err := parser.Parse(atLimit, "", "xml"); err != nil {
		t.Fatal(err)
	}
	beyondLimit := "<a>" + atLimit + "</a>"
	for _, source := range []string{beyondLimit, `<!DOCTYPE a><a/>`} {
		if _, err := parser.Parse(source, "", "xml"); !errors.Is(err, parser.ErrInvalidDocument) {
			t.Fatalf("XML limit bypassed: %v", err)
		}
	}
	_, err := parser.Parse("{", "", "json")
	var syntax *json.SyntaxError
	if !errors.Is(err, parser.ErrInvalidDocument) || !errors.As(err, &syntax) {
		t.Fatalf("underlying error lost: %v", err)
	}
}
