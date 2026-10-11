package app

import (
	"github.com/google/uuid"
	"net/http"
	"strings"
)

func (a *App) createPost(w http.ResponseWriter, r *http.Request) {
	id := a.viewer(r)
	authenticated(id)
	var b struct {
		Body     string  `json:"body"`
		ParentID *string `json:"parentId"`
	}
	decode(w, r, &b)
	b.Body = strings.TrimSpace(b.Body)
	if n := len([]rune(b.Body)); n < 1 || n > 280 {
		fail(400, "invalid_input", "帖子需为1～280字。")
	}
	if b.ParentID != nil {
		if _, e := uuid.Parse(*b.ParentID); e != nil {
			fail(400, "invalid_input", "无法回复这条帖子。")
		}
		if a.post(*b.ParentID, id) == nil {
			fail(404, "parent_not_found", "要回复的帖子不存在。")
		}
	}
	pid := uuid.NewString()
	_, e := a.db.Exec("INSERT INTO posts(id,author_id,body,parent_id,created_at) VALUES(?,?,?,?,?)", pid, id, b.Body, b.ParentID, now())
	check(e)
	jsonResponse(w, 201, map[string]any{"post": a.post(pid, id)})
}
func (a *App) like(w http.ResponseWriter, r *http.Request) {
	id := a.viewer(r)
	authenticated(id)
	pid := r.PathValue("id")
	if a.post(pid, id) == nil {
		fail(404, "post_not_found", "这条帖子不存在。")
	}
	var e error
	if r.Method == "POST" {
		_, e = a.db.Exec("INSERT OR IGNORE INTO likes(user_id,post_id,created_at) VALUES(?,?,?)", id, pid, now())
	} else {
		_, e = a.db.Exec("DELETE FROM likes WHERE user_id=? AND post_id=?", id, pid)
	}
	check(e)
	jsonResponse(w, 200, map[string]any{"post": a.post(pid, id)})
}
