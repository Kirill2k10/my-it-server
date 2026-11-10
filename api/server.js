
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = 3000;

const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID } = process.env;

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Ошибка: заполните TELEGRAM_TOKEN и TELEGRAM_CHAT_ID в .env');
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_TOKEN);

// Разрешаем локальные запросы, включая index.html через file://
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin === 'null' ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    callback(new Error('CORS: origin not allowed'));
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Принимаем заявку
app.post('/submit', async (req, res) => {
  try {
    const { name, phone } = req.body || {};

    // Проверяем данные
    if (
      typeof name !== 'string' ||
      typeof phone !== 'string' ||
      !name.trim() ||
      !phone.trim() ||
      name.length > 100 ||
      phone.length > 30
    ) {
      return res.status(400).json({
        success: false,
        error: 'Укажите корректные имя и телефон'
      });
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    const message =
      `Новая заявка! Имя: ${cleanName}, Телефон: ${cleanPhone}`;

    // Отправляем сообщение в Telegram
    await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message);

    console.log('Новая заявка успешно отправлена');

    return res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error('Ошибка отправки в Telegram:', error.message);

    return res.status(500).json({
      success: false,
      error: 'Не удалось отправить заявку'
    });
  }
});

// Запускаем сервер
module.exports = app;
