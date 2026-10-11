package main

import (
	"github.com/ImWenyaoT/etc/trumpet-twitter/internal/app"
	"log"
	"os"
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
	if e = a.SeedDemo(); e != nil {
		log.Fatal(e)
	}
	log.Print("演示账号 mina / leo / ava，密码 password123")
}
