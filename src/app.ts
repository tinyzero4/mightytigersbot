import "module-alias/register"; // Uncomment this line for production!!!

import {
  SSL_CERT_PATH,
  SSL_KEY_PATH,
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
  bot.handleUpdate(req.body)
    .then(() => res.json({ processed: true }))
    .catch((err) => {
      res.status(400);
      return res.json({ error: err });
    });
});

http.createServer(app).listen(3000);
https.createServer(options, app).listen(443);