import "module-alias/register";
import { bot } from "./bot";

bot.options.shutdownOnCompletion = true;

exports.handler = (event, context: any, callback) => {
  if (!context) console.log(`No context supplied`);
  bot.handleUpdate(JSON.parse(event.body));
  return callback(undefined, {
    statusCode: 200,
    body: `{processed: true}`,
  });
};