package app

import (
	"fmt"
	"net/http"
	"strings"
)

func (a *App) follow(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	id, err := a.authenticated(r)
	if err != nil {
		return err
	}
	target := r.PathValue("id")
	if target == id {
		return problem(400, "self_follow_not_allowed", "不能关注自己的账号。")
	}
	if user, err := a.user(ctx, "id", target, id); err != nil {
		return err
	} else if user == nil {
		return problem(404, "user_not_found", "用户不存在")
	}
	var e error
	if r.Method == "POST" {
		_, e = a.db.ExecContext(ctx, "INSERT OR IGNORE INTO follows(follower_id,following_id,created_at) VALUES(?,?,?)", id, target, now())
	} else {
		_, e = a.db.ExecContext(ctx, "DELETE FROM follows WHERE follower_id=? AND following_id=?", id, target)
	}
	if e != nil {
		return fmt.Errorf("write follow: %w", e)
	}
	u, e := a.user(ctx, "id", target, id)
	if e != nil {
		return e
	}
	jsonResponse(w, 200, map[string]any{"user": u})
	return nil
}
func (a *App) profile(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	id, err := a.viewer(r)
	if err != nil {
		return err
	}
	u, err := a.user(ctx, "handle", r.PathValue("handle"), id)
	if err != nil {
		return err
	}
	if u == nil {
		return problem(404, "user_not_found", "用户不存在")
	}
	if strings.HasSuffix(r.URL.Path, "/posts") {
		p, err := a.page(ctx, id, u.ID, r.URL.Query().Get("cursor"))
		if err != nil {
			return err
		}
		jsonResponse(w, 200, map[string]any{"user": u, "items": p.Items, "nextCursor": p.NextCursor})
	} else {
		jsonResponse(w, 200, map[string]any{"user": u})
	}
	return nil
}
