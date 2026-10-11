package app

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
)

type apiError struct {
	status        int
	code, message string
}

func fail(status int, code, message string) { panic(apiError{status, code, message}) }
func check(e error) {
	if e != nil {
		panic(e)
	}
}
func jsonResponse(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if status != 204 {
		_ = json.NewEncoder(w).Encode(v)
	}
}
func decode(w http.ResponseWriter, r *http.Request, v any) {
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	d.DisallowUnknownFields()
	if e := d.Decode(v); e != nil {
		fail(400, "invalid_body", "提交内容有误，请刷新后重试。")
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		fail(400, "invalid_body", "提交内容有误，请刷新后重试。")
	}
}
func authenticated(id string) {
	if id == "" {
		fail(401, "unauthorized", "请先登录。")
	}
}

func (a *App) routes() {
	m := http.NewServeMux()
	m.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) { jsonResponse(w, 200, map[string]bool{"ok": true}) })
	m.HandleFunc("POST /auth/register", a.auth)
	m.HandleFunc("POST /auth/login", a.auth)
	m.HandleFunc("POST /auth/logout", func(w http.ResponseWriter, r *http.Request) {
		if c, e := r.Cookie("session_id"); e == nil {
			_, e = a.db.Exec("DELETE FROM sessions WHERE id=?", c.Value)
			check(e)
		}
		http.SetCookie(w, &http.Cookie{Name: "session_id", Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: a.secure, MaxAge: -1})
		w.WriteHeader(204)
	})
	m.HandleFunc("GET /me", func(w http.ResponseWriter, r *http.Request) {
		var u *User
		if id := a.viewer(r); id != "" {
			u = a.user("id", id, id)
		}
		jsonResponse(w, 200, map[string]any{"user": u})
	})
	m.HandleFunc("POST /posts", a.createPost)
	m.HandleFunc("GET /timeline", func(w http.ResponseWriter, r *http.Request) {
		id := a.viewer(r)
		authenticated(id)
		jsonResponse(w, 200, a.page(id, "", r.URL.Query().Get("cursor")))
	})
	m.HandleFunc("POST /posts/{id}/like", a.like)
	m.HandleFunc("DELETE /posts/{id}/like", a.like)
	m.HandleFunc("POST /users/{id}/follow", a.follow)
	m.HandleFunc("DELETE /users/{id}/follow", a.follow)
	m.HandleFunc("GET /users/{handle}", a.profile)
	m.HandleFunc("GET /users/{handle}/posts", a.profile)
	m.Handle("GET /", http.FileServer(http.Dir("web/dist")))
	a.handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				e, ok := v.(apiError)
				if !ok {
					log.Printf("request failed: %v", v)
					e = apiError{500, "internal_error", "暂时无法使用，请稍后再试。"}
				}
				jsonResponse(w, e.status, map[string]any{"error": map[string]string{"code": e.code, "message": e.message}})
			}
		}()
		if r.Method != "GET" && r.Method != "HEAD" {
			if origin := r.Header.Get("Origin"); origin != "" {
				expected := os.Getenv("WEB_ORIGIN")
				if expected == "" {
					expected = "http://" + r.Host
				}
				if origin != expected {
					fail(403, "invalid_origin", "当前页面无法提交，请重新打开。")
				}
			}
		}
		m.ServeHTTP(w, r)
	})
}
