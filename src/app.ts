import "module-alias/register";

import { VERSION } from "@configs/config";
import { bot } from "./bot";
import http from "http";
import express from "express";

const app = express();
app.use(express.json());

app.post("/event", (req, res) => {
  console.log(`[handle event]: ${new Date()}:${JSON.stringify(req.body)}`);
  bot.handleUpdate(req.body)
    .then(() => res.json({ processed: true }))
    .catch((err) => {
      res.status(400);
      console.log(err);
      return res.json({ error: err });
    });
});

app.get("/health", (_req, res) => {
  return res.json({ version: VERSION });
});

http.createServer(app).listen(3000);