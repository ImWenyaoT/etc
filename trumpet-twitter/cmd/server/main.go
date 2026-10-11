package main

import (
	"context"
	"errors"
	"github.com/ImWenyaoT/etc/trumpet-twitter/internal/app"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	file := os.Getenv("DB_FILE")
	if file == "" {
		file = "data/trumpet.db"
	}
	a, e := app.Open(file)
	if e != nil {
		log.Fatal(e)
	}
	defer a.Close()
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = "127.0.0.1:18205"
	}
	s := &http.Server{Addr: addr, Handler: a, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second}
	log.Printf("listening on %s", addr)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	errorsCh := make(chan error, 1)
	go func() { errorsCh <- s.ListenAndServe() }()
	select {
	case err := <-errorsCh:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := s.Shutdown(shutdown); err != nil {
			log.Printf("shutdown: %v", err)
			_ = s.Close()
		}
	}
}
