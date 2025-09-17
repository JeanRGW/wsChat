import express from "express";
import ws from "ws";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import http from "http";
import { userExists, addUser } from "./db";

dotenv.config({
    quiet: true,
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET)
    throw new Error("JWT_SECRET is not defined in environment variables");

const app = express();
const server = http.createServer(app);
const wss = new ws.Server({ server });
app.use(express.static("./public"));

wss.on("connection", (socket, req) => {
    const params = new URL(req.url!, `http://${req.headers.host}`).searchParams;
    const token = params.get("token");
    let username: string | null = null;

    if (!token) {
        const reqUsername = params.get("username")?.toLowerCase();
        if (reqUsername) {
            if (!userExists(reqUsername)) {
                addUser(reqUsername);
                const token = signUser(reqUsername);
                username = reqUsername;

                socket.send(JSON.stringify({ type: "token", token }));
            } else {
                sendError(socket, "Usuário já em uso, recarregue a página");
                return;
            }
        } else {
            sendError(socket, "Token ou username necessários");
            return;
        }
    } else {
        const verified = verifyToken(token);
        if (!verified) {
            sendError(socket, "Token inválido, faça logout");
            return;
        }
        username = verified;
    }

    wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify({ type: "user_joined", username }));
        }
    });

    socket.on("message", (raw) => {
        try {
            const msg = JSON.parse(raw.toString());

            if (msg.type === "message") {
                wss.clients.forEach((client) => {
                    if (client.readyState === ws.OPEN) {
                        client.send(
                            JSON.stringify({
                                type: "message",
                                from: username,
                                text: msg.text,
                            })
                        );
                    }
                });
            }
        } catch (err) {
            socket.close(1003, "Invalid message format");
        }
    });

    socket.on("close", () => {
        if (username)
            wss.clients.forEach((client) => {
                if (client.readyState === ws.OPEN)
                    client.send(
                        JSON.stringify({ type: "user_left", username })
                    );
            });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const signUser = (username: string): string => {
    return jwt.sign({}, JWT_SECRET, { subject: username });
};

const verifyToken = (token: string): string | null => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        return decoded.sub as string;
    } catch (err) {
        return null;
    }
};

const sendError = (socket: ws, message: string) => {
    socket.send(JSON.stringify({ type: "error", message }));
    socket.close(1008, message);
};
