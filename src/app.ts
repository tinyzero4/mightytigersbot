// import "module-alias/register";
import { bot } from "./bot";
import express from "express";

const app = express();
app.use(express.json());

app.post('/mightytigers', (req, res) => {
    bot.handleUpdate(req.body)
        .then(() => res.json({ processed: true }))
        .catch((err) => {
            res.status(400);
            return res.json({ error: err })
        });
});

app.listen(8080);