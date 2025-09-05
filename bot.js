import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const WEBAPP_URL = process.env.WEBAPP_URL;
const ALLOWED = process.env.ALLOWED_TELEGRAM_ID?.split(",").map(s=>s.trim());

bot.start(async ctx => {
  if(ALLOWED && !ALLOWED.includes(String(ctx.from.id))) return ctx.reply("Доступ закрыт");
  await ctx.reply("Открыть облачный браузер:", Markup.keyboard([
    [Markup.button.webApp("Open Instagram", WEBAPP_URL)]
  ]).resize());
});

bot.launch();
console.log("Bot started");
