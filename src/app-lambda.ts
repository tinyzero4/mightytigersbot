import "module-alias/register";
import { bot } from "./bot";

exports.handler = (event, context: any, callback) => {
  console.info(`${JSON.stringify(event)}`);
  if (context) {
    bot.handleUpdate(JSON.parse(event.body));
  }
  return callback(undefined, {
    statusCode: 200,
    body: `{processed: true, event: "${event.body}"}`,
  });
};