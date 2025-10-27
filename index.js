import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fs from "fs";
import axios from "axios";
import ytdlp from "yt-dlp-exec"; // مكتبة تعمل على Replit بدون أوامر system

// 🟢 توكن البوت (مضمّن)
const TOKEN = "8461219655:AAF1jnw_IpKuu1tdXJSW9ubnjRe5pxlMoxo";

// 🟢 إنشاء البوت والسيرفر
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

  bot.sendMessage(chatId, "🎬 اختر نوع التحميل المطلوب:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🎥 تحميل الفيديو", callback_data: `video|${url}` },
          { text: "🎵 تحميل الصوت (MP3)", callback_data: `audio|${url}` },
        ],
        [{ text: "🖼️ بدون علامة مائية", callback_data: `nowm|${url}` }],
      ],
    },
  });
});

// 🧠 التعامل مع الأزرار
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const [type, url] = query.data.split("|");

  bot.answerCallbackQuery(query.id, { text: "⏳ جاري التحميل..." });
  bot.sendMessage(chatId, "🔄 جاري التحميل، يرجى الانتظار قليلاً...");

  const timestamp = Date.now();
  const output = `media_${timestamp}.${type === "audio" ? "mp3" : "mp4"}`;

  try {
    let options = {};
    if (type === "audio") {
      options = {
        extractAudio: true,
        audioFormat: "mp3",
        output,
      };
    } else if (type === "video") {
      options = { format: "mp4", output };
    } else if (type === "nowm") {
      options = { format: "mp4", output };
    }

    await ytdlp(url, options);

    if (!fs.existsSync(output)) {
      return bot.sendMessage(chatId, "❌ لم يتم العثور على الملف بعد التحميل.");
    }

    const sizeMB = fs.statSync(output).size / (1024 * 1024);

    if (sizeMB > 48) {
      const stream = fs.createReadStream(output);
      const upload = await axios.post("https://transfer.sh/", stream, {
        headers: { "Content-Type": "application/octet-stream" },
      });
      await bot.sendMessage(chatId, `📦 الملف كبير جدًا، يمكنك التحميل من الرابط:\n${upload.data}`);
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

    fs.unlinkSync(output);
  } catch (err) {
    console.error("❌ خطأ:", err);
    bot.sendMessage(chatId, "⚠️ حدث خطأ أثناء التحميل. حاول مرة أخرى.");
  }
});

// 🌐 تشغيل السيرفر (للـ Replit أو Render)
app.get("/", (req, res) => {
  res.send("✅ بوت الواقدي لتحميل الفيديوهات يعمل بنجاح 🎥");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
