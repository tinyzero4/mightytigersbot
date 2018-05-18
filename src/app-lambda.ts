import Telegraf from "telegraf";
const app = new Telegraf(process.env.BOT_TOKEN);

exports.handler = (event, context: any, callback) => {
  const tmp = JSON.parse(event.body);
  if (context) {
    app.handleUpdate(tmp);
  }
  return callback(undefined, {
    statusCode: 200,
    body: `${tmp}`,
  });
};