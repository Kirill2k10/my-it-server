
"use strict";

const express = require("express");
const cors = require("cors");
const { Telegraf } = require("telegraf");

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

// Разрешаем CORS-запросы с любого источника.
app.use(cors({ origin: "*" }));

// Поддержка JSON и стандартных HTML-форм.
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({
  extended: false,
  limit: "10kb"
}));

// ==========================================
// TELEGRAM CONFIG
// ==========================================

// Vercel автоматически предоставляет переменные
// окружения из Settings → Environment Variables.

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Не запускаем polling: для Serverless он не нужен.
const bot = TELEGRAM_TOKEN
  ? new Telegraf(TELEGRAM_TOKEN)
  : null;

// ==========================================
// POST /submit
// ==========================================

app.post("/submit", async (req, res) => {
  try {
    // Проверяем настройки Telegram.
    if (!bot || !TELEGRAM_CHAT_ID) {
      console.error("Telegram credentials are missing");

      return res.status(503).json({
        success: false,
        error: "Telegram не настроен"
      });
    }

    // Получаем name и phone из формы.
    const { name, phone } = req.body || {};

    // Проверяем типы данных.
    if (
      typeof name !== "string" ||
      typeof phone !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Необходимо указать имя и телефон"
      });
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    // Валидация имени.
    if (
      cleanName.length < 2 ||
      cleanName.length > 100
    ) {
      return res.status(400).json({
        success: false,
        error: "Некорректное имя"
      });
    }

    // Валидация телефона.
    const phoneDigits = cleanPhone.replace(/\D/g, "");

    if (
      cleanPhone.length > 30 ||
      phoneDigits.length < 10 ||
      phoneDigits.length > 15
    ) {
      return res.status(400).json({
        success: false,
        error: "Некорректный номер телефона"
      });
    }

    // ======================================
    // TELEGRAM MESSAGE
    // ======================================

    const message =
      `Новая заявка! Имя: ${cleanName}, Телефон: ${cleanPhone}`;

    // Отправляем сообщение и ожидаем результат.
    await bot.telegram.sendMessage(
      TELEGRAM_CHAT_ID,
      message
    );

    console.log("Заявка успешно отправлена в Telegram");

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error(
      "Ошибка отправки заявки:",
      error.message
    );

    return res.status(502).json({
      success: false,
      error: "Не удалось отправить заявку в Telegram"
    });
  }
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  console.error("Ошибка API:", error.message);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: "Некорректный JSON"
    });
  }

  return res.status(500).json({
    success: false,
    error: "Внутренняя ошибка сервера"
  });
});

// ==========================================
// VERCEL SERVERLESS EXPORT
// ==========================================

// Не используем app.listen().
// Vercel самостоятельно запускает приложение.
// Маршрут /submit должен быть направлен
// на эту функцию конфигурацией проекта.

module.exports = app;
