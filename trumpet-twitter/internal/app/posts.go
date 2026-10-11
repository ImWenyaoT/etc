package app

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

func (a *App) createPost(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	id, err := a.authenticated(r)
	if err != nil {
		return err
	}
	var b struct {
		Body     string  `json:"body"`
		ParentID *string `json:"parentId"`
	}
	if err := decode(w, r, &b); err != nil {
		return err
	}
	b.Body = strings.TrimSpace(b.Body)
	if n := len([]rune(b.Body)); n < 1 || n > 280 {
		return problem(400, "invalid_input", "帖子需为1～280字。")
	}
	if b.ParentID != nil {
		if _, e := uuid.Parse(*b.ParentID); e != nil {
			return problem(400, "invalid_input", "无法回复这条帖子。")
		}
		if parent, err := a.post(ctx, *b.ParentID, id); err != nil {
			return err
		} else if parent == nil {
			return problem(404, "parent_not_found", "要回复的帖子不存在。")
		}
	}
	pid := uuid.NewString()
	_, e := a.db.ExecContext(ctx, "INSERT INTO posts(id,author_id,body,parent_id,created_at) VALUES(?,?,?,?,?)", pid, id, b.Body, b.ParentID, now())
	if e != nil {
		return fmt.Errorf("write post: %w", e)
	}
	post, e := a.post(ctx, pid, id)
	if e != nil {
		return e
	}
	jsonResponse(w, 201, map[string]any{"post": post})
	return nil
}
func (a *App) like(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	id, err := a.authenticated(r)
	if err != nil {
		return err
	}
	pid := r.PathValue("id")
	if post, err := a.post(ctx, pid, id); err != nil {
		return err
	} else if post == nil {
		return problem(404, "post_not_found", "这条帖子不存在。")
	}
	var e error
	if r.Method == "POST" {
		_, e = a.db.ExecContext(ctx, "INSERT OR IGNORE INTO likes(user_id,post_id,created_at) VALUES(?,?,?)", id, pid, now())
	} else {
		_, e = a.db.ExecContext(ctx, "DELETE FROM likes WHERE user_id=? AND post_id=?", id, pid)
	}
	if e != nil {
		return fmt.Errorf("write post: %w", e)
	}
	post, e := a.post(ctx, pid, id)
	if e != nil {
		return e
	}
	jsonResponse(w, 200, map[string]any{"post": post})
	return nil
}
