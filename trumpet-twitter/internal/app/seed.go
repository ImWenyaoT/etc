package app

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// SeedDemo populates an empty database. Existing data is never deleted.
func (a *App) SeedDemo(ctx context.Context) error {
	tx, e := a.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	var count int
	if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM users").Scan(&count); e != nil {
		return e
	}
	if count != 0 {
		return fmt.Errorf("demo seed requires an empty database; use a separate DB_FILE")
	}
	hash, e := bcrypt.GenerateFromPassword([]byte("password123"), 12)
	if e != nil {
		return e
	}
	ids := []string{uuid.NewString(), uuid.NewString(), uuid.NewString()}
	for i, u := range []struct{ handle, name string }{{"mina", "Mina Chen"}, {"leo", "Leo Park"}, {"ava", "Ava Stone"}} {
		if _, e = tx.ExecContext(ctx, "INSERT INTO users(id,handle,display_name,bio,password_hash,created_at) VALUES(?,?,?,'',?,?)", ids[i], u.handle, u.name, string(hash), now()); e != nil {
			return e
		}
	}
	for _, pair := range [][2]int{{0, 1}, {0, 2}, {1, 0}} {
		if _, e = tx.ExecContext(ctx, "INSERT INTO follows(follower_id,following_id,created_at) VALUES(?,?,?)", ids[pair[0]], ids[pair[1]], now()); e != nil {
			return e
		}
	}
	first := uuid.NewString()
	for i, p := range []struct {
		author int
		body   string
		parent any
	}{{1, "欢迎使用 Go + React 版 Trumpet。", nil}, {0, "用一个小项目练习完整的全栈流程。", nil}, {2, "关注、点赞与回复，都从简单的数据关系开始。", nil}, {0, "回复也作为帖子保存。", first}} {
		id := uuid.NewString()
		if i == 0 {
			id = first
		}
		if _, e = tx.ExecContext(ctx, "INSERT INTO posts(id,author_id,body,parent_id,created_at) VALUES(?,?,?,?,?)", id, ids[p.author], p.body, p.parent, now()); e != nil {
			return e
		}
	}
	for _, i := range []int{0, 2} {
		if _, e = tx.ExecContext(ctx, "INSERT INTO likes(user_id,post_id,created_at) VALUES(?,?,?)", ids[i], first, now()); e != nil {
			return e
		}
	}
	return tx.Commit()
}
