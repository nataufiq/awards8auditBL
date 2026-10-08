// Admin-only: delete vote records.
// Delete everyone:   /api/reset?key=<ADMIN_KEY>&all=yes
// Delete one person: /api/reset?key=<ADMIN_KEY>&voter=<Nama Lengkap>
// List who voted:    /api/reset?key=<ADMIN_KEY>
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_KEY = process.env.ADMIN_KEY;
const KEY = "awards8:votes";

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd)
  });
  return (await r.json()).result;
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (!ADMIN_KEY || req.query.key !== ADMIN_KEY) return res.status(403).send("Akses ditolak.");
  if (!URL_ || !TOKEN) return res.status(500).send("Storage belum diatur.");

  if (req.query.all === "yes") {
    await redis(["DEL", KEY]);
    return res.send("Semua data pemilihan sudah dihapus.");
  }
  if (req.query.voter) {
    const n = await redis(["HDEL", KEY, req.query.voter]);
    return res.send(n ? `Data "${req.query.voter}" sudah dihapus.` : `Nama "${req.query.voter}" tidak ditemukan.`);
  }
  const names = (await redis(["HKEYS", KEY])) || [];
  res.send(`Sudah memilih (${names.length}):\n` + names.sort().join("\n"));
};
