package app

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func call(t *testing.T, a *App, method, path, body string, cookie *http.Cookie) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	if cookie != nil {
		r.AddCookie(cookie)
	}
	w := httptest.NewRecorder()
	a.ServeHTTP(w, r)
	var data map[string]any
	if w.Code != 204 {
		if e := json.Unmarshal(w.Body.Bytes(), &data); e != nil {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
	}
	return w, data
}
func register(t *testing.T, a *App, handle string) (*http.Cookie, string) {
	w, d := call(t, a, "POST", "/auth/register", fmt.Sprintf(`{"handle":%q,"displayName":"Ada","password":"password123"}`, handle), nil)
	if w.Code != 201 {
		t.Fatalf("%d %v", w.Code, d)
	}
	return w.Result().Cookies()[0], d["user"].(map[string]any)["id"].(string)
}
func TestSocialFlow(t *testing.T) {
	file := filepath.Join(t.TempDir(), "app.db")
	a, e := Open(file)
	if e != nil {
		t.Fatal(e)
	}
	defer func() { a.Close() }()
	alice, aid := register(t, a, "alice")
	bob, bid := register(t, a, "bobby")
	w, _ := call(t, a, "GET", "/timeline", "", nil)
	if w.Code != 401 {
		t.Fatal(w.Code)
	}
	w, d := call(t, a, "POST", "/posts", `{"body":"hello"}`, bob)
	if w.Code != 201 {
		t.Fatal(d)
	}
	pid := d["post"].(map[string]any)["id"].(string)
	_, d = call(t, a, "GET", "/timeline", "", alice)
	if len(d["items"].([]any)) != 0 {
		t.Fatal("unfollowed author leaked")
	}
	w, _ = call(t, a, "POST", "/users/"+bid+"/follow", "", alice)
	if w.Code != 200 {
		t.Fatal(w.Code)
	}
	_, d = call(t, a, "GET", "/timeline", "", alice)
	if len(d["items"].([]any)) != 1 {
		t.Fatal(d)
	}
	for i := 0; i < 2; i++ {
		_, d = call(t, a, "POST", "/posts/"+pid+"/like", "", alice)
	}
	if d["post"].(map[string]any)["likeCount"].(float64) != 1 {
		t.Fatal("like not idempotent")
	}
	call(t, a, "POST", "/posts", fmt.Sprintf(`{"body":"reply","parentId":%q}`, pid), alice)
	_, d = call(t, a, "POST", "/posts/"+pid+"/like", "", alice)
	if d["post"].(map[string]any)["replyCount"].(float64) != 1 {
		t.Fatal(d)
	}
	w, _ = call(t, a, "POST", "/users/"+aid+"/follow", "", alice)
	if w.Code != 400 {
		t.Fatal("self-follow")
	}
	for i := 0; i < 25; i++ {
		call(t, a, "POST", "/posts", fmt.Sprintf(`{"body":"post %d"}`, i), alice)
	}
	_, d = call(t, a, "GET", "/timeline", "", alice)
	if len(d["items"].([]any)) != 20 {
		t.Fatal(d)
	}
	seen := map[string]bool{}
	for _, p := range d["items"].([]any) {
		seen[p.(map[string]any)["id"].(string)] = true
	}
	cursor := d["nextCursor"].(string)
	_, d = call(t, a, "GET", "/timeline?cursor="+cursor, "", alice)
	if len(d["items"].([]any)) != 6 {
		t.Fatal(d)
	}
	for _, p := range d["items"].([]any) {
		if seen[p.(map[string]any)["id"].(string)] {
			t.Fatal("duplicate page item")
		}
	}
	a.Close()
	a, e = Open(file)
	if e != nil {
		t.Fatal(e)
	}
	w, d = call(t, a, "GET", "/api/me", "", alice)
	if w.Code != 200 || d["user"] == nil {
		t.Fatal("session persistence")
	}
	w, _ = call(t, a, "POST", "/auth/logout", "", alice)
	if w.Code != 204 {
		t.Fatal(w.Code)
	}
	w, _ = call(t, a, "GET", "/timeline", "", alice)
	if w.Code != 401 {
		t.Fatal("logout failed")
	}
	w, _ = call(t, a, "POST", "/auth/login", `{"handle":"alice","password":"password123"}`, nil)
	if w.Code != 200 {
		t.Fatal("login failed")
	}
}
func TestValidation(t *testing.T) {
	a, e := Open(":memory:")
	if e != nil {
		t.Fatal(e)
	}
	defer a.Close()
	c, _ := register(t, a, "alice")
	for _, b := range []string{`{"body":""}`, `{"body":"x"} {}`, `{"body":"x","parentId":"wrong"}`, `{"body":"` + strings.Repeat("字", 281) + `"}`} {
		w, _ := call(t, a, "POST", "/posts", b, c)
		if w.Code != 400 {
			t.Fatalf("%d %s", w.Code, b)
		}
	}
	w, _ := call(t, a, "POST", "/auth/register", `{"handle":"alice","displayName":"X","password":"password123"}`, nil)
	if w.Code != 409 {
		t.Fatal(w.Code)
	}
	w, _ = call(t, a, "POST", "/auth/login", `{"handle":"alice","password":"wrongpass"}`, nil)
	if w.Code != 401 {
		t.Fatal(w.Code)
	}
	r := httptest.NewRequest("POST", "/auth/logout", nil)
	r.Header.Set("Origin", "https://attacker.example")
	r.AddCookie(c)
	rec := httptest.NewRecorder()
	a.ServeHTTP(rec, r)
	if rec.Code != 403 {
		t.Fatal("cross origin mutation accepted")
	}
}

func TestSeedPreservesExistingData(t *testing.T) {
	a, e := Open(":memory:")
	if e != nil {
		t.Fatal(e)
	}
	defer a.Close()
	if e = a.SeedDemo(); e != nil {
		t.Fatal(e)
	}
	if e = a.SeedDemo(); e == nil {
		t.Fatal("nonempty database accepted")
	}
	w, d := call(t, a, "POST", "/auth/login", `{"handle":"mina","password":"password123"}`, nil)
	if w.Code != 200 || d["user"] == nil {
		t.Fatal(d)
	}
	cookie := w.Result().Cookies()[0]
	_, d = call(t, a, "GET", "/timeline", "", cookie)
	if len(d["items"].([]any)) != 3 {
		t.Fatal(d)
	}
}
