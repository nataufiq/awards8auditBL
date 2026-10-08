// Vercel Serverless Function: stores votes in Upstash Redis.
// Env vars (added automatically by the Upstash integration): KV_REST_API_URL, KV_REST_API_TOKEN
// Voters can only submit and check their own status. They cannot read other people's votes.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
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
  if (!URL_ || !TOKEN) return res.status(500).json({ error: "Storage not configured" });

  // Check whether a single voter has already voted
  if (req.method === "GET") {
    if (!req.query.voter) return res.status(403).json({ error: "Forbidden" });
    const exists = await redis(["HEXISTS", KEY, req.query.voter]);
    return res.json({ voted: exists === 1 });
  }

  // Submit a ballot (once per voter)
  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || !body.voter || !body.picks) return res.status(400).json({ error: "Invalid payload" });
    const added = await redis(["HSETNX", KEY, body.voter, JSON.stringify(body)]);
    if (added === 0) return res.status(409).json({ error: "Already voted" });
    return res.status(201).json({ ok: true });
  }

  res.status(405).end();
};
