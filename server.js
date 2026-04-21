const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;
const API_BASE = "https://franchise2.tgstars.tg";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("LIBERAL API работает");
});

app.post("/api/connect-key", async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.json({ ok: false, error: "Нет ключа" });
    }

    const response = await fetch(`${API_BASE}/api/v1/client/balance`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      return res.json({ ok: false, error: "Неверный API ключ" });
    }

    res.json({
      ok: true,
      user: {
        id: data.user_id,
        username: data.username,
        balance: data.balance_rub
      }
    });
  } catch (e) {
    res.json({ ok: false, error: "Ошибка сервера" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LIBERAL работает на порту ${PORT}`);
});
