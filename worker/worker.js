// Mustangs carpool claims API — Cloudflare Worker + KV.
// No accounts: identity is the honor system among four families.
// The X-Team header and origin check keep drive-by bots out, nothing more.

const ORIGIN = "https://aerebol-ops.github.io";
const TEAM = "mustangs-2026";
const FAMILIES = ["Lyons", "Schlaht", "Aubin", "Novlesky"];
const SESSIONS = [
  "s1","s2","s3","s4","s5","s6","s7","s8","s9","s10","s11","s12","s13","s14"
];

function cors(extra) {
  return Object.assign({
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Team",
    "Cache-Control": "no-store"
  }, extra || {});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    if (url.pathname === "/claims" && request.method === "GET") {
      const raw = await env.CLAIMS.get("board");
      return new Response(raw || "{}", {
        headers: cors({ "Content-Type": "application/json" })
      });
    }

    if (url.pathname === "/claim" && request.method === "POST") {
      if (request.headers.get("X-Team") !== TEAM) {
        return new Response('{"error":"nope"}', { status: 403, headers: cors() });
      }
      let body;
      try { body = await request.json(); } catch (e) {
        return new Response('{"error":"bad json"}', { status: 400, headers: cors() });
      }
      const id = String(body.id || "");
      const family = String(body.family || "");
      const note = String(body.note || "").slice(0, 140);
      if (!SESSIONS.includes(id)) {
        return new Response('{"error":"unknown session"}', { status: 400, headers: cors() });
      }
      if (family && !FAMILIES.includes(family)) {
        return new Response('{"error":"unknown family"}', { status: 400, headers: cors() });
      }
      const raw = await env.CLAIMS.get("board");
      const board = raw ? JSON.parse(raw) : {};
      if (family) {
        board[id] = { family: family, note: note, t: Date.now() };
      } else {
        delete board[id]; // empty family = unclaim
      }
      await env.CLAIMS.put("board", JSON.stringify(board));
      return new Response(JSON.stringify(board), {
        headers: cors({ "Content-Type": "application/json" })
      });
    }

    return new Response('{"error":"not found"}', { status: 404, headers: cors() });
  }
};
