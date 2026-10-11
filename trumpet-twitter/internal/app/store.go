package app

import (
	"database/sql"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	_ "modernc.org/sqlite"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

//go:embed schema.sql
var schema string

type App struct {
	db      *sql.DB
	handler http.Handler
	secure  bool
}

func Open(file string) (*App, error) {
	if file != ":memory:" {
		if e := os.MkdirAll(filepath.Dir(file), 0700); e != nil {
			return nil, e
		}
	}
	db, e := sql.Open("sqlite", file)
	if e != nil {
		return nil, e
	}
	db.SetMaxOpenConns(1)
	if _, e = db.Exec(schema); e != nil {
		db.Close()
		return nil, e
	}
	if _, e = db.Exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;"); e != nil {
		db.Close()
		return nil, e
	}
	a := &App{db: db, secure: os.Getenv("COOKIE_SECURE") == "true"}
	a.routes()
	return a, nil
}
func (a *App) Close() error { return a.db.Close() }
func (a *App) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		r = r.Clone(r.Context())
		r.URL.Path = strings.TrimPrefix(r.URL.Path, "/api")
	}
	a.handler.ServeHTTP(w, r)
}
func now() string { return time.Now().UTC().Format("2006-01-02T15:04:05.000Z") }

type User struct {
	ID             string `json:"id"`
	Handle         string `json:"handle"`
	DisplayName    string `json:"displayName"`
	Bio            string `json:"bio"`
	CreatedAt      string `json:"createdAt"`
	FollowerCount  int    `json:"followerCount"`
	FollowingCount int    `json:"followingCount"`
	FollowedByMe   bool   `json:"followedByMe"`
}
type Post struct {
	ID         string  `json:"id"`
	Body       string  `json:"body"`
	ParentID   *string `json:"parentId"`
	CreatedAt  string  `json:"createdAt"`
	Author     User    `json:"author"`
	LikeCount  int     `json:"likeCount"`
	ReplyCount int     `json:"replyCount"`
	LikedByMe  bool    `json:"likedByMe"`
}
type Page struct {
	Items      []Post  `json:"items"`
	NextCursor *string `json:"nextCursor"`
}

func (a *App) user(column, value, viewer string) *User {
	u := User{}
	e := a.db.QueryRow("SELECT id,handle,display_name,bio,created_at FROM users WHERE "+column+"=?", value).Scan(&u.ID, &u.Handle, &u.DisplayName, &u.Bio, &u.CreatedAt)
	if errors.Is(e, sql.ErrNoRows) {
		return nil
	}
	check(e)
	check(a.db.QueryRow(`SELECT (SELECT count(*) FROM follows WHERE following_id=?),(SELECT count(*) FROM follows WHERE follower_id=?),EXISTS(SELECT 1 FROM follows WHERE follower_id=? AND following_id=?)`, u.ID, u.ID, viewer, u.ID).Scan(&u.FollowerCount, &u.FollowingCount, &u.FollowedByMe))
	return &u
}
func (a *App) viewer(r *http.Request) string {
	c, e := r.Cookie("session_id")
	if e != nil {
		return ""
	}
	var id string
	e = a.db.QueryRow("SELECT user_id FROM sessions WHERE id=? AND expires_at>?", c.Value, now()).Scan(&id)
	if errors.Is(e, sql.ErrNoRows) {
		return ""
	}
	check(e)
	return id
}

const postSelect = `SELECT p.id,p.body,p.parent_id,p.created_at,u.id,u.handle,u.display_name,u.bio,u.created_at,(SELECT count(*) FROM likes WHERE post_id=p.id),(SELECT count(*) FROM posts WHERE parent_id=p.id),EXISTS(SELECT 1 FROM likes WHERE post_id=p.id AND user_id=?) FROM posts p JOIN users u ON u.id=p.author_id `

type scanner interface{ Scan(...any) error }

func scanPost(row scanner) (Post, error) {
	p := Post{}
	e := row.Scan(&p.ID, &p.Body, &p.ParentID, &p.CreatedAt, &p.Author.ID, &p.Author.Handle, &p.Author.DisplayName, &p.Author.Bio, &p.Author.CreatedAt, &p.LikeCount, &p.ReplyCount, &p.LikedByMe)
	return p, e
}
func (a *App) post(id, viewer string) *Post {
	p, e := scanPost(a.db.QueryRow(postSelect+"WHERE p.id=?", viewer, id))
	if errors.Is(e, sql.ErrNoRows) {
		return nil
	}
	check(e)
	return &p
}
func (a *App) page(viewer, author, cursor string) Page {
	where := "p.parent_id IS NULL AND p.author_id=?"
	args := []any{viewer, author}
	if author == "" {
		where = "p.parent_id IS NULL AND (p.author_id=? OR EXISTS(SELECT 1 FROM follows WHERE follower_id=? AND following_id=p.author_id))"
		args = []any{viewer, viewer, viewer}
	}
	if cursor != "" {
		var c struct {
			CreatedAt string `json:"createdAt"`
			ID        string `json:"id"`
		}
		b, e := base64.RawURLEncoding.DecodeString(cursor)
		if e != nil || json.Unmarshal(b, &c) != nil || c.CreatedAt == "" || c.ID == "" {
			fail(400, "invalid_cursor", "分页游标无效")
		}
		where += " AND (p.created_at<? OR (p.created_at=? AND p.id<?))"
		args = append(args, c.CreatedAt, c.CreatedAt, c.ID)
	}
	rows, e := a.db.Query(postSelect+"WHERE "+where+" ORDER BY p.created_at DESC,p.id DESC LIMIT 21", args...)
	check(e)
	defer rows.Close()
	items := []Post{}
	for rows.Next() {
		p, e := scanPost(rows)
		check(e)
		items = append(items, p)
	}
	check(rows.Err())
	page := Page{Items: items}
	if len(items) > 20 {
		page.Items = items[:20]
		p := page.Items[19]
		b, e := json.Marshal(map[string]string{"createdAt": p.CreatedAt, "id": p.ID})
		check(e)
		c := base64.RawURLEncoding.EncodeToString(b)
		page.NextCursor = &c
	}
	return page
}
