import "module-alias/register";
import fs from "fs";
import http from "http";
import https from "https";
import express from "express";
import bot from "@root/bot";
import {
    SSL_CERT,
    SSL_KEY,
    VERSION,
} from "@configs/config";

const app = express();
app.use(express.json());

app.post("/event", async (req, res) => {
    try {
        await bot.handleUpdate(req.body);
        res.json({processed: true});
    } catch (error) {
        console.error(`[error] processing request: ${JSON.stringify(error)}`);
        return res.status(400).json({error});
    }
});

app.get("/health", (_req, res) => {
    return res.json({version: VERSION});
});

http.createServer(app).listen(3000);
https.createServer({key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT)}, app).listen(443);
