import "module-alias/register"; // Comment this line for dev!!!

import {
  SSL_CERT_PATH,
  SSL_KEY_PATH,
  VERSION,
} from "@configs/config";
import { bot } from "./bot";
import fs from "fs";
import https from "https";
import http from "http";
import express from "express";

const options = {
  key: fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH)
};

const app = express();
app.use(express.json());

app.post("/mightytigers", (req, res) => {
  console.log(`[handle update]: ${new Date()}`);
  bot.handleUpdate(req.body)
    .then(() => res.json({ processed: true }))
    .catch((err) => {
      res.status(400);
      return res.json({ error: err });
    });
});

app.get("/health", (_req, res) => {
  return res.json({ version: VERSION });
});

http.createServer(app).listen(3000);
https.createServer(options, app).listen(443);