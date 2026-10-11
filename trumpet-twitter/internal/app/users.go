package app

import (
	"net/http"
	"strings"
)

func (a *App) follow(w http.ResponseWriter, r *http.Request) {
	id := a.viewer(r)
	authenticated(id)
	target := r.PathValue("id")
	if target == id {
		fail(400, "self_follow_not_allowed", "不能关注自己的账号。")
	}
	if a.user("id", target, id) == nil {
		fail(404, "user_not_found", "用户不存在")
	}
	var e error
	if r.Method == "POST" {
		_, e = a.db.Exec("INSERT OR IGNORE INTO follows(follower_id,following_id,created_at) VALUES(?,?,?)", id, target, now())
	} else {
		_, e = a.db.Exec("DELETE FROM follows WHERE follower_id=? AND following_id=?", id, target)
	}
	check(e)
	jsonResponse(w, 200, map[string]any{"user": a.user("id", target, id)})
}
func (a *App) profile(w http.ResponseWriter, r *http.Request) {
	id := a.viewer(r)
	u := a.user("handle", r.PathValue("handle"), id)
	if u == nil {
		fail(404, "user_not_found", "用户不存在")
	}
	if strings.HasSuffix(r.URL.Path, "/posts") {
		p := a.page(id, u.ID, r.URL.Query().Get("cursor"))
		jsonResponse(w, 200, map[string]any{"user": u, "items": p.Items, "nextCursor": p.NextCursor})
	} else {
		jsonResponse(w, 200, map[string]any{"user": u})
	}
}
