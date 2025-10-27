import TelegramBot from "node-telegram-bot-api";
import { exec } from "child_process";
import express from "express";
import fs from "fs";
import axios from "axios";

// 🟢 توكن البوت
const TOKEN = process.env.BOT_TOKEN || "8461219655:AAF1jnw_IpKuu1tdXJSW9ubnjRe5pxlMoxo";

// 🟢 تهيئة البوت والسيرفر
const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

// 🟢 رسالة البداية
bot.onText(/\/start/, (msg) => {
  const text = `👋 أهلاً بك في بوت *الواقدي لتحميل الفيديوهات* 🎥

أرسل أي رابط من:
📺 YouTube  
🎵 TikTok  
📸 Instagram  
🐦 Twitter(X)  
📘 Facebook  
👻 Snapchat  

وسأعطيك خيارات التحميل فوراً 💎`;

  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// 🟡 استقبال أي رسالة تحتوي على رابط
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text || text.startsWith("/")) return;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  if (!match) return;

  const url = match[0];

  // 🧠 عرض لوحة الأزرار التفاعلية
  bot.sendMessage(chatId, "🎬 اختر نوع التحميل المطلوب:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🎥 تحميل الفيديو", callback_data: `video|${url}` },
          { text: "🎵 تحميل الصوت (MP3)", callback_data: `audio|${url}` },
        ],
        [{ text: "🖼️ بدون علامة مائية (TikTok / IG)", callback_data: `nowm|${url}` }],
      ],
    },
  });
});

// 🧠 التعامل مع ضغط الأزرار
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const [type, url] = query.data.split("|");

  bot.answerCallbackQuery(query.id, { text: "⏳ جاري التحميل..." });
  bot.sendMessage(chatId, "🔄 جاري التحميل، يرجى الانتظار قليلاً...");

  const timestamp = Date.now();
  const output = `media_${timestamp}.${type === "audio" ? "mp3" : "mp4"}`;

  try {
    // ⚙️ تحديد الأمر حسب نوع التحميل
    let command = "";

    if (type === "video") {
      command = `yt-dlp -f mp4 -o ${output} "${url}"`;
    } else if (type === "audio") {
      command = `yt-dlp -x --audio-format mp3 -o ${output} "${url}"`;
    } else if (type === "nowm") {
      // تحميل بدون علامة مائية (TikTok / IG)
      try {
        const apiRes = await axios.get(`https://api.vevioz.com/api/button/${encodeURIComponent(url)}`);
        const cleanUrl = apiRes.data?.url || url;
        command = `yt-dlp -f mp4 -o ${output} "${cleanUrl}"`;
      } catch {
        command = `yt-dlp -f mp4 -o ${output} "${url}"`;
      }
    }

    exec(command, async (error) => {
      if (error) {
        console.error("❌ خطأ:", error);
        bot.sendMessage(chatId, "⚠️ حدث خطأ أثناء التحميل، حاول لاحقاً.");
        return;
      }

      if (!fs.existsSync(output)) {
        bot.sendMessage(chatId, "❌ لم يتم العثور على الملف بعد التحميل.");
        return;
      }

      // 🧮 فحص حجم الملف قبل الإرسال
      const sizeMB = fs.statSync(output).size / (1024 * 1024);

      if (sizeMB > 48) {
        bot.sendMessage(chatId, "📦 الملف كبير جداً، إليك رابط تحميل خارجي:");

        const upload = await axios.post("https://transfer.sh/", fs.createReadStream(output), {
          headers: { "Content-Type": "application/octet-stream" },
        });

        bot.sendMessage(chatId, upload.data);
      } else {
        if (type === "audio") {
          await bot.sendAudio(chatId, fs.createReadStream(output), {
            caption: "🎧 تم التحميل بواسطة بوت الواقدي 💚",
          });
        } else {
          await bot.sendVideo(chatId, fs.createReadStream(output), {
            caption: "🎬 تم التحميل بنجاح بواسطة بوت الواقدي 💚",
          });
        }
      }

      // 🧹 حذف الملف المؤقت
      fs.unlinkSync(output);
    });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ حدث خطأ أثناء التحميل.");
  }
});

// 🌐 تشغيل السيرفر (للاستضافة على Render أو GitHub Pages)
app.get("/", (req, res) => {
  res.send("✅ بوت الواقدي لتحميل الفيديوهات يعمل بنجاح 🎥");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
