import { createClient } from "npm:@supabase/supabase-js@2";
const allowedOrigins = new Set(["https://haonan1010.github.io", "https://starlit-adventure-haonan.haonan101010607854.chatgpt.site"]);
const boards = ["speed10", "waves", "dash", "combo"];
async function hashToken(token: string) {
  const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(data)).map(n => n.toString(16).padStart(2, "0")).join("");
}
function cleanName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return !name || Array.from(name).length > 16 || /[\u0000-\u001f\u007f<>]/.test(name) ? null : name;
}
Deno.serve(async request => {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info"
  };
  if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "不允许的网站来源" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  try {
    const projectUrl = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!projectUrl || !serviceKey) return reply({ error: "后台环境变量缺失" }, 503);
    const db = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const pathname = new URL(request.url).pathname, parts = pathname.split("/").filter(Boolean), index = parts.indexOf("leaderboard");
    const path = index >= 0 ? "/" + parts.slice(index + 1).join("/") : pathname;
    if (request.method === "GET" && path === "/") {
      const { error } = await db.from("scores").select("player_id").limit(1);
      if (error) throw error;
      return reply({ ok: true, message: "方块原野四榜后台已就绪", author: "找南", supportedBoards: boards });
    }
    if (request.method === "GET" && path === "/leaderboard") {
      const results: Record<string, unknown[]> = {};
      for (const board of boards) {
        const { data, error } = await db.from("scores").select("player_id,score,elapsed,updated_at,players!inner(nickname)")
          .eq("board", board).order("score", { ascending: board === "speed10" }).order("elapsed", { ascending: true })
          .order("updated_at", { ascending: true }).order("player_id", { ascending: true }).limit(10);
        if (error) throw error;
        let previousScore: number | null = null, previousRank = 0;
        results[board] = (data || []).map((row: any, i: number) => {
          const rank = board === "combo" && row.score === previousScore ? previousRank : i + 1;
          previousScore = row.score; previousRank = rank;
          return { rank, nickname: Array.isArray(row.players) ? row.players[0]?.nickname : row.players?.nickname,
            score: row.score, elapsed: row.elapsed, updatedAt: row.updated_at };
        });
      }
      return reply({ ok: true, boards: results });
    }
    if (request.method !== "POST") return reply({ error: "接口不存在" }, 404);
    if (Number(request.headers.get("Content-Length") || 0) > 4096) return reply({ error: "请求过大" }, 413);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 4096) return reply({ error: "请求过大" }, 413);
    let body: any;
    try { body = JSON.parse(text); } catch { return reply({ error: "请求格式错误" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "请求格式错误" }, 400);
    if (path === "/register") {
      const nickname = cleanName(body.nickname);
      if (!nickname) return reply({ error: "昵称请输入1至16个字符" }, 400);
      const playerId = crypto.randomUUID(), token = crypto.randomUUID() + crypto.randomUUID();
      const { error } = await db.from("players").insert({ id: playerId, token_hash: await hashToken(token), nickname, created_at: Date.now() });
      if (error) throw error;
      return reply({ ok: true, playerId, token, nickname });
    }
    if (!["/profile", "/me", "/scores"].includes(path)) return reply({ error: "接口不存在" }, 404);
    const authorization = request.headers.get("Authorization") || "", token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (typeof body.playerId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.playerId) || token.length < 32 || token.length > 128)
      return reply({ error: "玩家身份无效" }, 401);
    const { data: player, error: authError } = await db.from("players").select("id,nickname").eq("id", body.playerId).eq("token_hash", await hashToken(token)).maybeSingle();
    if (authError) throw authError;
    if (!player) return reply({ error: "玩家身份验证失败" }, 401);
    if (path === "/profile") {
      const nickname = cleanName(body.nickname);
      if (!nickname) return reply({ error: "昵称请输入1至16个字符" }, 400);
      const { error } = await db.from("players").update({ nickname }).eq("id", player.id);
      if (error) throw error;
      return reply({ ok: true, nickname });
    }
    if (path === "/me") {
      const { data, error } = await db.from("scores").select("board,score,elapsed,updated_at").eq("player_id", player.id);
      if (error) throw error;
      return reply({ ok: true, nickname: player.nickname, scores: data || [] });
    }
    const { board, score, elapsed } = body;
    if (!boards.includes(board)) return reply({ error: "排行榜类型错误" }, 400);
    if (!Number.isFinite(score) || !Number.isFinite(elapsed) || elapsed <= 0 || elapsed > 31536000) return reply({ error: "成绩或用时无效" }, 400);
    if (board === "speed10" && (score <= 0 || score > 31536000 || Math.abs(score - elapsed) > 0.01)) return reply({ error: "十波用时无效" }, 400);
    if (board === "waves" && (!Number.isInteger(score) || score < 1 || score > 100)) return reply({ error: "波数必须为1至100" }, 400);
    if (["dash", "combo"].includes(board) && (!Number.isInteger(score) || score < 1 || score > 1000000)) return reply({ error: "连击次数无效" }, 400);
    const record = { player_id: player.id, board, score, elapsed, updated_at: Date.now() };
    const { data: inserted, error: insertError } = await db.from("scores").upsert(record, { onConflict: "player_id,board", ignoreDuplicates: true }).select("score");
    if (insertError) throw insertError;
    const comparison = board === "speed10" ? "gt" : "lt";
    const { data: updated, error: updateError } = await db.from("scores").update({ score, elapsed, updated_at: record.updated_at })
      .eq("player_id", player.id).eq("board", board).or(`score.${comparison}.${score},and(score.eq.${score},elapsed.gt.${elapsed})`).select("score");
    if (updateError) throw updateError;
    return reply({ ok: true, improved: !!inserted?.length || !!updated?.length });
  } catch (error) {
    console.error("Leaderboard request failed:", error instanceof Error ? error.message : "database error");
    return reply({ error: "后台暂时不可用，请检查数据库及函数日志" }, 500);
  }
});
