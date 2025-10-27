import TelegramBot from "node-telegram-bot-api";
import { exec } from "child_process";
import express from "express";
import fs from "fs";
import axios from "axios";

const TOKEN = "ضع_توكن_البوت_هنا";
const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

// 🟢 رسالة الترحيب
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 أهلاً بك في بوت *الواقدي لتحميل الفيديوهات* 🎥

أرسل أي رابط من:
📺 YouTube  
🎵 TikTok  
📸 Instagram  
🐦 Twitter(X)  
📘 Facebook  
👻 Snapchat  

وسأعطيك خيارات التحميل مباشرة 💎`,
    { parse_mode: "Markdown" }
  );
});

// 🟡 استقبال أي رابط فيديو
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text || text.startsWith("/")) return;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  if (!match) return;

  const url = match[0];

  // عرض الأزرار التفاعلية
  bot.sendMessage(chatId, "🎬 اختر نوع التحميل المطلوب:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🎥 فيديو كامل", callback_data: `video|${url}` },
          { text: "🎵 صوت فقط (MP3)", callback_data: `audio|${url}` },
        ],
        [
          { text: "🖼️ بدون علامة مائية", callback_data: `nowm|${url}` },
        ],
      ],
    },
  });
});

// 🧠 تنفيذ عند الضغط على زر
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const [type, url] = query.data.split("|");

  bot.answerCallbackQuery(query.id, { text: "⏳ جاري التحميل..." });
  bot.sendMessage(chatId, "🔄 جاري التحميل، يرجى الانتظار...");

  const output = `video_${Date.now()}.mp4`;

  try {
    // ⚙️ تحديد الأمر حسب نوع التحميل
    let command = "";
    if (type === "video") command = `yt-dlp -f mp4 -o ${output} ${url}`;
    else if (type === "audio") command = `yt-dlp -f bestaudio --extract-audio --audio-format mp3 -o ${output} ${url}`;
    else if (type === "nowm") {
      // تحميل بدون علامة مائية من TikTok أو Instagram
      try {
        const apiUrl = `https://api.vevioz.com/api/button/${encodeURIComponent(url)}`;
        const res = await axios.get(apiUrl);
        const link = res.data.url || url;
        command = `yt-dlp -f mp4 -o ${output} ${link}`;
      } catch {
        command = `yt-dlp -f mp4 -o ${output} ${url}`;
      }
    }

    exec(command, async (error) => {
      if (error) {
        console.error(error);
        bot.sendMessage(chatId, "⚠️ حدث خطأ أثناء التحميل.");
        return;
      }

      if (!fs.existsSync(output)) {
        bot.sendMessage(chatId, "❌ لم أستطع تحميل الفيديو.");
        return;
      }

      // التحقق من الحجم (حد تيليجرام 50MB)
      const size = fs.statSync(output).size / (1024 * 1024);

      if (size > 48) {
        bot.sendMessage(chatId, "📦 الملف كبير جدًا، إليك رابط تحميل خارجي:");
        const upload = await axios.post(
          "https://transfer.sh/",
          fs.createReadStream(output),
          { headers: { "Content-Type": "application/octet-stream" } }
        );
        bot.sendMessage(chatId, upload.data);
      } else {
        if (type === "audio") {
          await bot.sendAudio(chatId, fs.createReadStream(output), {
            caption: "🎧 تم التحميل بنجاح بواسطة بوت الواقدي 💚",
          });
        } else {
          await bot.sendVideo(chatId, fs.createReadStream(output), {
            caption: "🎬 تم التحميل بنجاح بواسطة بوت الواقدي 💚",
          });
        }
      }

      fs.unlinkSync(output);
    });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ لم أستطع تنفيذ التحميل.");
  }
});

// 🌐 سيرفر Render أو Railway
app.get("/", (req, res) => res.send("✅ بوت الواقدي لتحميل الفيديوهات جاهز!"));
app.listen(3000, () => console.log("🚀 Server running on port 3000"));
