package app

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
)

// requestError carries a safe client message; database and other internal errors
// remain ordinary wrapped errors and are never exposed in HTTP responses.
type requestError struct {
	status        int
	code, message string
}

func (e *requestError) Error() string { return e.message }
func problem(status int, code, message string) error {
	return &requestError{status: status, code: code, message: message}
}

type endpoint func(http.ResponseWriter, *http.Request) error

// adapt is the only place that translates returned errors into HTTP responses.
// Normal validation and storage failures never use panic for control flow.
func adapt(next endpoint) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := next(w, r); err != nil {
			var e *requestError
			if !errors.As(err, &e) {
				log.Printf("%s %s: %v", r.Method, r.URL.Path, err)
				e = &requestError{500, "internal_error", "暂时无法使用，请稍后再试。"}
			}
			jsonResponse(w, e.status, map[string]any{"error": map[string]string{"code": e.code, "message": e.message}})
		}
	}
}
func jsonResponse(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if status != http.StatusNoContent {
		if err := json.NewEncoder(w).Encode(v); err != nil {
			log.Printf("write response: %v", err)
		}
	}
}
func decode(w http.ResponseWriter, r *http.Request, v any) error {
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		return problem(400, "invalid_body", "提交内容有误，请刷新后重试。")
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return problem(400, "invalid_body", "提交内容有误，请刷新后重试。")
	}
	return nil
}
func (a *App) authenticated(r *http.Request) (string, error) {
	id, err := a.viewer(r)
	if err != nil {
		return "", err
	}
	if id == "" {
		return "", problem(401, "unauthorized", "请先登录。")
	}
	return id, nil
}
func (a *App) logout(w http.ResponseWriter, r *http.Request) error {
	if c, err := r.Cookie("session_id"); err == nil {
		if _, err = a.db.ExecContext(r.Context(), "DELETE FROM sessions WHERE id=?", c.Value); err != nil {
			return fmt.Errorf("delete session: %w", err)
		}
	}
	http.SetCookie(w, &http.Cookie{Name: "session_id", Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: a.config.CookieSecure, MaxAge: -1})
	w.WriteHeader(http.StatusNoContent)
	return nil
}
func (a *App) me(w http.ResponseWriter, r *http.Request) error {
	id, err := a.viewer(r)
	if err != nil {
		return err
	}
	var u *User
	if id != "" {
		u, err = a.user(r.Context(), "id", id, id)
		if err != nil {
			return err
		}
	}
	jsonResponse(w, 200, map[string]any{"user": u})
	return nil
}
func (a *App) timeline(w http.ResponseWriter, r *http.Request) error {
	id, err := a.authenticated(r)
	if err != nil {
		return err
	}
	page, err := a.page(r.Context(), id, "", r.URL.Query().Get("cursor"))
	if err != nil {
		return err
	}
	jsonResponse(w, 200, page)
	return nil
}
func (a *App) routes() {
	m := http.NewServeMux()
	m.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) { jsonResponse(w, 200, map[string]bool{"ok": true}) })
	for _, route := range []struct {
		pattern string
		run     endpoint
	}{
		{"POST /auth/register", a.auth}, {"POST /auth/login", a.auth}, {"POST /auth/logout", a.logout},
		{"GET /me", a.me}, {"POST /posts", a.createPost}, {"GET /timeline", a.timeline},
		{"POST /posts/{id}/like", a.like}, {"DELETE /posts/{id}/like", a.like},
		{"POST /users/{id}/follow", a.follow}, {"DELETE /users/{id}/follow", a.follow},
		{"GET /users/{handle}", a.profile}, {"GET /users/{handle}/posts", a.profile},
	} {
		m.HandleFunc(route.pattern, adapt(route.run))
	}
	m.Handle("GET /", http.FileServer(http.Dir("web/dist")))
	a.handler = adapt(func(w http.ResponseWriter, r *http.Request) error {
		if r.Method != "GET" && r.Method != "HEAD" {
			if origin := r.Header.Get("Origin"); origin != "" {
				expected := a.config.WebOrigin
				if expected == "" {
					expected = "http://" + r.Host
				}
				if origin != expected {
					return problem(403, "invalid_origin", "当前页面无法提交，请重新打开。")
				}
			}
		}
		m.ServeHTTP(w, r)
		return nil
	})
}
