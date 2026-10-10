// ============================================================
//  Shiba.Client — admin endpoint (создание / отзыв ключей)
// ============================================================
//  POST /api/admin   body:
//    { "secret":"ADMIN_SECRET", "action":"create",
//      "key":"SHIBA-PERM-ABC", "type":"perm", "days":0 }
//    { "secret":"...", "action":"revoke", "key":"..." }
//    { "secret":"...", "action":"info",   "key":"..." }
//
//  type: "temp" | "paid" | "perm" | "dev"
//  days: срок в днях (0 = бессрочный, для paid/perm/dev)
//
//  Дёргать можно из браузера-расширения REST, Postman, или
//  простой fetch-страницы. Защищено ADMIN_SECRET.
// ============================================================

import { kv } from "@vercel/kv";

function randKey(prefix) {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 12; i++) {
    s += c[Math.floor(Math.random() * c.length)];
    if (i === 3 || i === 7) s += "-";
  }
  return prefix + "-" + s;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  if (body.secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ ok: false, reason: "forbidden" });
  }

  const action = body.action;

  if (action === "create") {
    const type = body.type || "paid";
    const key = body.key || randKey("SHIBA-" + type.toUpperCase());
    const days = Number(body.days || 0);
    const rec = {
      type,
      hwid: "",
      expires: days > 0 ? Math.floor(Date.now() / 1000 + days * 86400) : 0,
      revoked: false,
      created: Math.floor(Date.now() / 1000),
    };
    await kv.set("key:" + key, rec);
    return res.status(200).json({ ok: true, key, record: rec });
  }

  if (action === "revoke") {
    const rec = await kv.get("key:" + body.key);
    if (!rec) return res.status(200).json({ ok: false, reason: "not found" });
    rec.revoked = true;
    await kv.set("key:" + body.key, rec);
    return res.status(200).json({ ok: true });
  }

  if (action === "info") {
    const rec = await kv.get("key:" + body.key);
    return res.status(200).json({ ok: true, record: rec || null });
  }

  return res.status(200).json({ ok: false, reason: "unknown action" });
}
