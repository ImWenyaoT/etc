package app

import (
	"context"
	"database/sql"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schema string

// App owns its SQLite connection and HTTP routing; use it as an http.Handler.
type App struct {
	db      *sql.DB
	handler http.Handler
	config  Config
}

// Config is immutable after Open. WebOrigin, when set, is the browser origin
// allowed to submit mutations; otherwise requests must match their HTTP host.
// CookieSecure must be enabled when cookies are served over HTTPS.
type Config struct {
	CookieSecure bool
	WebOrigin    string
}

// Open owns a SQLite connection and returns an HTTP handler. Call Close after
// requests have drained. Configuration is explicit; environment variables are
// read only by command entrypoints. An empty database is initialized on open.
// Static files are served from web/dist relative to the process working directory.
func Open(file string, config Config) (*App, error) {
	if config.WebOrigin != "" {
		u, err := url.Parse(config.WebOrigin)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" || u.User != nil || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.ForceQuery {
			return nil, errors.New("WEB_ORIGIN must be an HTTP(S) origin without a path, credentials, query or fragment")
		}
	}
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
	a := &App{db: db, config: config}
	a.routes()
	return a, nil
}

// Close releases the owned database after active requests have drained.
func (a *App) Close() error { return a.db.Close() }

// ServeHTTP accepts paths with or without the /api prefix.
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

func (a *App) user(ctx context.Context, column, value, viewer string) (*User, error) {
	u := User{}
	e := a.db.QueryRowContext(ctx, "SELECT id,handle,display_name,bio,created_at FROM users WHERE "+column+"=?", value).Scan(&u.ID, &u.Handle, &u.DisplayName, &u.Bio, &u.CreatedAt)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	if e != nil {
		return nil, fmt.Errorf("read user: %w", e)
	}
	if e = a.db.QueryRowContext(ctx, `SELECT (SELECT count(*) FROM follows WHERE following_id=?),(SELECT count(*) FROM follows WHERE follower_id=?),EXISTS(SELECT 1 FROM follows WHERE follower_id=? AND following_id=?)`, u.ID, u.ID, viewer, u.ID).Scan(&u.FollowerCount, &u.FollowingCount, &u.FollowedByMe); e != nil {
		return nil, fmt.Errorf("read follows: %w", e)
	}
	return &u, nil
}
func (a *App) viewer(r *http.Request) (string, error) {
	ctx := r.Context()
	c, e := r.Cookie("session_id")
	if e != nil {
		return "", nil
	}
	var id string
	e = a.db.QueryRowContext(ctx, "SELECT user_id FROM sessions WHERE id=? AND expires_at>?", c.Value, now()).Scan(&id)
	if errors.Is(e, sql.ErrNoRows) {
		return "", nil
	}
	if e != nil {
		return "", fmt.Errorf("read session: %w", e)
	}
	return id, nil
}

const postSelect = `SELECT p.id,p.body,p.parent_id,p.created_at,u.id,u.handle,u.display_name,u.bio,u.created_at,(SELECT count(*) FROM likes WHERE post_id=p.id),(SELECT count(*) FROM posts WHERE parent_id=p.id),EXISTS(SELECT 1 FROM likes WHERE post_id=p.id AND user_id=?) FROM posts p JOIN users u ON u.id=p.author_id `

type scanner interface{ Scan(...any) error }

func scanPost(row scanner) (Post, error) {
	p := Post{}
	e := row.Scan(&p.ID, &p.Body, &p.ParentID, &p.CreatedAt, &p.Author.ID, &p.Author.Handle, &p.Author.DisplayName, &p.Author.Bio, &p.Author.CreatedAt, &p.LikeCount, &p.ReplyCount, &p.LikedByMe)
	return p, e
}
func (a *App) post(ctx context.Context, id, viewer string) (*Post, error) {
	p, e := scanPost(a.db.QueryRowContext(ctx, postSelect+"WHERE p.id=?", viewer, id))
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	if e != nil {
		return nil, fmt.Errorf("read post: %w", e)
	}
	return &p, nil
}
func (a *App) page(ctx context.Context, viewer, author, cursor string) (Page, error) {
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
			return Page{}, problem(400, "invalid_cursor", "分页游标无效")
		}
		where += " AND (p.created_at<? OR (p.created_at=? AND p.id<?))"
		args = append(args, c.CreatedAt, c.CreatedAt, c.ID)
	}
	rows, e := a.db.QueryContext(ctx, postSelect+"WHERE "+where+" ORDER BY p.created_at DESC,p.id DESC LIMIT 21", args...)
	if e != nil {
		return Page{}, fmt.Errorf("read timeline: %w", e)
	}
	defer rows.Close()
	items := []Post{}
	for rows.Next() {
		p, e := scanPost(rows)
		if e != nil {
			return Page{}, fmt.Errorf("read timeline: %w", e)
		}
		items = append(items, p)
	}
	if e = rows.Err(); e != nil {
		return Page{}, fmt.Errorf("iterate timeline: %w", e)
	}
	page := Page{Items: items}
	if len(items) > 20 {
		page.Items = items[:20]
		p := page.Items[19]
		b, e := json.Marshal(map[string]string{"createdAt": p.CreatedAt, "id": p.ID})
		if e != nil {
			return Page{}, fmt.Errorf("read timeline: %w", e)
		}
		c := base64.RawURLEncoding.EncodeToString(b)
		page.NextCursor = &c
	}
	return page, nil
}
