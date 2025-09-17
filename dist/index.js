"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = __importDefault(require("ws"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const http_1 = __importDefault(require("http"));
const db_1 = require("./db");
dotenv_1.default.config({
    quiet: true,
});
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET)
    throw new Error("JWT_SECRET is not defined in environment variables");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.default.Server({ server });
app.use(express_1.default.static("./public"));
wss.on("connection", (socket, req) => {
    var _a;
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const token = params.get("token");
    let username = null;
    if (!token) {
        const reqUsername = (_a = params.get("username")) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (reqUsername) {
            if (!(0, db_1.userExists)(reqUsername)) {
                (0, db_1.addUser)(reqUsername);
                const token = signUser(reqUsername);
                username = reqUsername;
                socket.send(JSON.stringify({ type: "token", token }));
            }
            else {
                sendError(socket, "Usuário já em uso, recarregue a página");
                return;
            }
        }
        else {
            sendError(socket, "Token ou username necessários");
            return;
        }
    }
    else {
        const verified = verifyToken(token);
        if (!verified) {
            sendError(socket, "Token inválido, faça logout");
            return;
        }
        username = verified;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            client.send(JSON.stringify({ type: "user_joined", username }));
        }
    });
    socket.on("message", (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === "message") {
                wss.clients.forEach((client) => {
                    if (client.readyState === ws_1.default.OPEN) {
                        client.send(JSON.stringify({
                            type: "message",
                            from: username,
                            text: msg.text,
                        }));
                    }
                });
            }
        }
        catch (err) {
            socket.close(1003, "Invalid message format");
        }
    });
    socket.on("close", () => {
        if (username)
            wss.clients.forEach((client) => {
                if (client.readyState === ws_1.default.OPEN)
                    client.send(JSON.stringify({ type: "user_left", username }));
            });
    });
});
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
const signUser = (username) => {
    return jsonwebtoken_1.default.sign({}, JWT_SECRET, { subject: username });
};
const verifyToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded.sub;
    }
    catch (err) {
        return null;
    }
};
const sendError = (socket, message) => {
    socket.send(JSON.stringify({ type: "error", message }));
    socket.close(1008, message);
};
