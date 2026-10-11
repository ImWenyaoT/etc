package parser

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"gopkg.in/yaml.v3"
	"io"
	"path/filepath"
	"strings"
)

type Result struct {
	Format     string `json:"format"`
	Data       any    `json:"data"`
	SourcePath string `json:"sourcePath,omitempty"`
}

func Detect(path, format string) (string, error) {
	if format == "" {
		format = strings.TrimPrefix(filepath.Ext(path), ".")
	}
	format = strings.ToLower(format)
	if format == "yml" {
		format = "yaml"
	}
	switch format {
	case "json", "yaml", "xml":
		return format, nil
	}
	return "", fmt.Errorf("unsupported or missing format: %q", format)
}
func Parse(source, path, format string) (Result, error) {
	f, e := Detect(path, format)
	if e != nil {
		return Result{}, e
	}
	var data any
	switch f {
	case "json":
		e = json.Unmarshal([]byte(source), &data)
	case "yaml":
		d := yaml.NewDecoder(strings.NewReader(source))
		e = d.Decode(&data)
		if e == io.EOF {
			e = nil
		}
		if e == nil {
			var extra any
			if d.Decode(&extra) != io.EOF {
				e = fmt.Errorf("multiple YAML documents are not supported")
			}
		}
		if e == nil {
			var b []byte
			b, e = json.Marshal(data)
			if e == nil {
				e = json.Unmarshal(b, &data)
			}
		}
	case "xml":
		data, e = parseXML(source)
	}
	if e != nil {
		return Result{}, fmt.Errorf("failed to parse %s: %w", f, e)
	}
	return Result{f, data, path}, nil
}
func add(m map[string]any, k string, v any) {
	if old, ok := m[k]; ok {
		if a, ok := old.([]any); ok {
			m[k] = append(a, v)
		} else {
			m[k] = []any{old, v}
		}
	} else {
		m[k] = v
	}
}

type element struct {
	name  string
	value map[string]any
	text  bytes.Buffer
}

func parseXML(source string) (any, error) {
	d := xml.NewDecoder(strings.NewReader(source))
	stack := []*element{}
	var root map[string]any
	for {
		tok, e := d.Token()
		if e == io.EOF {
			break
		}
		if e != nil {
			return nil, e
		}
		switch v := tok.(type) {
		case xml.StartElement:
			if len(stack) >= 256 {
				return nil, fmt.Errorf("XML nesting limit exceeded")
			}
			n := &element{name: v.Name.Local, value: map[string]any{}}
			if len(v.Attr) > 0 {
				a := map[string]string{}
				for _, x := range v.Attr {
					a[x.Name.Local] = x.Value
				}
				n.value["$attributes"] = a
			}
			stack = append(stack, n)
		case xml.CharData:
			if len(stack) > 0 {
				stack[len(stack)-1].text.Write(v)
			} else if strings.TrimSpace(string(v)) != "" {
				return nil, fmt.Errorf("text outside root")
			}
		case xml.EndElement:
			if len(stack) == 0 {
				return nil, fmt.Errorf("unexpected end element")
			}
			n := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			if s := strings.TrimSpace(n.text.String()); s != "" {
				n.value["$text"] = s
			}
			if len(stack) > 0 {
				add(stack[len(stack)-1].value, n.name, n.value)
			} else {
				if root != nil {
					return nil, fmt.Errorf("multiple roots")
				}
				root = map[string]any{n.name: n.value}
			}
		case xml.Directive:
			return nil, fmt.Errorf("XML directives are not supported")
		}
	}
	if root == nil || len(stack) > 0 {
		return nil, fmt.Errorf("missing or incomplete root")
	}
	return root, nil
}
