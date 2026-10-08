// Admin-only Excel export.
// Open: https://<your-site>.vercel.app/api/export?key=<ADMIN_KEY>
// Set ADMIN_KEY in Vercel → Project → Settings → Environment Variables.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_KEY = process.env.ADMIN_KEY;
const KEY = "awards8:votes";

const AWARDS = ["Terambis", "Terlambat", "Tertidur", "Terdermawan", "Terfotogenik", "Terdeadliner",
  "Tersangka", "Tergrouporder", "Terjulit", "Terserah", "Terheboh", "Terdiam", "Terkepo", "Tercemas",
  "Terngilang", "Terrusuh", "Terrakus", "Terhedon", "Terlemot"];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  if (!ADMIN_KEY || req.query.key !== ADMIN_KEY) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(403).send("Akses ditolak.");
  }
  if (!URL_ || !TOKEN) return res.status(500).send("Storage belum diatur.");

  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(["HGETALL", KEY])
  });
  const flat = (await r.json()).result || [];
  const rows = [];
  for (let i = 1; i < flat.length; i += 2) rows.push(JSON.parse(flat[i]));
  rows.sort((a, b) => a.voter.localeCompare(b.voter));

  const cell = v => `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
  const header = ["Nama Mahasiswa", ...AWARDS];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#14235C" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Rekap Awards"><Table>
${header.map(() => `<Column ss:Width="150"/>`).join("")}
<Row>${header.map(t => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(t)}</Data></Cell>`).join("")}</Row>
${rows.map(row => `<Row>${cell(row.voter)}${AWARDS.map(a => cell(row.picks[a])).join("")}</Row>`).join("\n")}
</Table></Worksheet></Workbook>`;

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="Rekap_8Audit_Awards_${date}.xls"`);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(xml);
};
