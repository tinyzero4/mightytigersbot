import "module-alias/register";
import { bot, onShutdown } from "./bot";

exports.handler = (event, context: any, callback) => {
  if (context) {
    bot.handleUpdate(JSON.parse(event.body)).then(() => onShutdown());
  }
  return callback(undefined, {
    statusCode: 200,
    body: `{processed: true}`,
  });
};