import Database from "better-sqlite3";

const db = new Database("chat.db");

db.prepare(
    `
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY
    )
`
).run();

export function userExists(username: string): boolean {
    const row = db
        .prepare("SELECT 1 FROM users WHERE username = ?")
        .get(username);
    return !!row;
}

export function addUser(username: string) {
    db.prepare("INSERT OR IGNORE INTO users (username) VALUES (?)").run(
        username
    );
}
