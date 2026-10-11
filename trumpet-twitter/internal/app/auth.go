package app

import (
	"database/sql"
	"errors"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"regexp"
	"strings"
	"time"
)

var handlePattern = regexp.MustCompile(`^[a-z0-9_]{3,20}$`)

func (a *App) auth(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Handle      string `json:"handle"`
		DisplayName string `json:"displayName"`
		Password    string `json:"password"`
	}
	decode(w, r, &b)
	if !handlePattern.MatchString(b.Handle) || len([]rune(b.Password)) < 8 || len(b.Password) > 72 {
		fail(400, "invalid_input", "账号或密码不符合要求。")
	}
	register := strings.HasSuffix(r.URL.Path, "register")
	var id string
	status := 200
	if register {
		if n := len([]rune(strings.TrimSpace(b.DisplayName))); n < 1 || n > 80 {
			fail(400, "invalid_input", "昵称需为1～80字。")
		}
		if a.user("handle", b.Handle, "") != nil {
			fail(409, "handle_taken", "账号已被使用，请换一个。")
		}
		hash, e := bcrypt.GenerateFromPassword([]byte(b.Password), 12)
		check(e)
		id = uuid.NewString()
		_, e = a.db.Exec("INSERT INTO users(id,handle,display_name,bio,password_hash,created_at) VALUES(?,?,?,'',?,?)", id, b.Handle, strings.TrimSpace(b.DisplayName), string(hash), now())
		if e != nil {
			if a.user("handle", b.Handle, "") != nil {
				fail(409, "handle_taken", "账号已被使用，请换一个。")
			}
			check(e)
		}
		status = 201
	} else {
		var hash string
		e := a.db.QueryRow("SELECT id,password_hash FROM users WHERE handle=?", b.Handle).Scan(&id, &hash)
		if e != nil && !errors.Is(e, sql.ErrNoRows) {
			check(e)
		}
		if errors.Is(e, sql.ErrNoRows) {
			hash = "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW"
		}
		match := bcrypt.CompareHashAndPassword([]byte(hash), []byte(b.Password))
		if e != nil || match != nil {
			fail(401, "invalid_credentials", "账号或密码不正确，请重新输入。")
		}
	}
	expires := time.Now().UTC().Add(30 * 24 * time.Hour)
	token := uuid.NewString()
	_, e := a.db.Exec("DELETE FROM sessions WHERE expires_at<=?", now())
	check(e)
	_, e = a.db.Exec("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", token, id, expires.Format("2006-01-02T15:04:05.000Z"), now())
	check(e)
	http.SetCookie(w, &http.Cookie{Name: "session_id", Value: token, Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: a.secure, Expires: expires})
	jsonResponse(w, status, map[string]any{"user": a.user("id", id, id)})
}
