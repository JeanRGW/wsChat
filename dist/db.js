"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userExists = userExists;
exports.addUser = addUser;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const db = new better_sqlite3_1.default("chat.db");
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY
    )
`).run();
function userExists(username) {
    const row = db
        .prepare("SELECT 1 FROM users WHERE username = ?")
        .get(username);
    return !!row;
}
function addUser(username) {
    db.prepare("INSERT OR IGNORE INTO users (username) VALUES (?)").run(username);
}
