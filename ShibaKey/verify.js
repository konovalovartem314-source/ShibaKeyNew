// ============================================================
//  Shiba.Client — key verification backend (Vercel serverless)
// ============================================================
//  POST /api/verify   body: { "key": "...", "hwid": "..." }
//  ->  { "ok": true }  или  { "ok": false, "reason": "..." }
//
//  Ключи хранятся в Vercel KV (Upstash Redis). Формат записи:
//    key:<KEY>  ->  JSON { type, hwid, expires, revoked }
//      type:    "temp" | "paid" | "perm" | "dev"
//      hwid:    привязанный HWID (пусто = ещё не привязан)
//      expires: unix-время (0 = бессрочный)
//      revoked: true/false
//
//  Первая проверка привязывает ключ к HWID. Дальше тот же ключ
//  с чужого HWID -> отказ. Это и есть защита от передачи другому.
//
//  НАСТРОЙКА (переменные окружения в Vercel):
//    KV_REST_API_URL, KV_REST_API_TOKEN  — из Vercel KV (Storage).
//    ADMIN_SECRET                        — пароль для /api/admin.
// ============================================================

import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, reason: "POST only" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const key = (body.key || "").toString().trim();
  const hwid = (body.hwid || "").toString().trim();

  if (!key) return res.status(200).json({ ok: false, reason: "no key" });

  let rec;
  try {
    rec = await kv.get("key:" + key);
  } catch (e) {
    return res.status(200).json({ ok: false, reason: "storage error" });
  }
  if (!rec) return res.status(200).json({ ok: false, reason: "unknown key" });

  if (rec.revoked) return res.status(200).json({ ok: false, reason: "revoked" });

  if (rec.expires && rec.expires > 0 && Date.now() / 1000 > rec.expires) {
    return res.status(200).json({ ok: false, reason: "expired" });
  }

  // dev-ключ: работает где угодно, без привязки
  if (rec.type === "dev") {
    return res.status(200).json({ ok: true, type: "dev" });
  }

  // привязка к HWID
  if (!rec.hwid) {
    rec.hwid = hwid;
    try { await kv.set("key:" + key, rec); } catch {}
  } else if (rec.hwid !== hwid) {
    return res.status(200).json({ ok: false, reason: "wrong device" });
  }

  return res.status(200).json({ ok: true, type: rec.type });
}
