import "module-alias/register";

import {
    SSL_CERT_PATH,
    SSL_KEY_PATH,
    VERSION,
} from "@configs/config";
import { bot } from "./bot";
import fs from "fs";
import http from "http";
import https from "https";
import express from "express";

const app = express();
app.use(express.json());

app.post("/event", (req, res) => {
    console.log(`[handle event]: ${new Date()}:${JSON.stringify(req.body)}`);
    bot.handleUpdate(req.body)
        .then(() => res.json({processed: true}))
        .catch((err) => {
            res.status(400);
            console.log(`!!error while processing request: ${err}`);
            return res.json({error: err});
        });
});

app.get("/health", (_req, res) => {
    return res.json({version: VERSION});
});

http.createServer(app).listen(3000);
https.createServer({key: fs.readFileSync(SSL_KEY_PATH), cert: fs.readFileSync(SSL_CERT_PATH)}, app).listen(443);
