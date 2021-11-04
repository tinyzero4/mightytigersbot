import "module-alias/register";
import fs from "fs";
// import http from "http";
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

const options = {
    key: fs.readFileSync(SSL_KEY || "/opt/mightytigers/aws.key"),
    cert: fs.readFileSync(SSL_CERT || "/opt/mightytigers/aws.pem"),
};

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

// http.createServer(app).listen(3000);
https.createServer(options, app).listen(8443);
