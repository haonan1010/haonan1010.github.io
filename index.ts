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
      return reply({ ok: true, message: "方块原野四榜后台已就绪", author: "找南", supportedBoards: boards, accountsVersion: 1 });
    }
    if (request.method === "GET" && path === "/leaderboard") {
      const results: Record<string, unknown[]> = {};
      for (const board of boards) {
        const { data, error } = await db.from("scores").select("player_id,score,elapsed,updated_at,players!inner(nickname,login_name)")
          .eq("board", board).order("score", { ascending: board === "speed10" }).order("elapsed", { ascending: true })
          .order("updated_at", { ascending: true }).order("player_id", { ascending: true }).limit(10);
        if (error) throw error;
        let previousScore: number | null = null, previousRank = 0;
        results[board] = (data || []).map((row: any, i: number) => {
          const rank = board === "combo" && row.score === previousScore ? previousRank : i + 1;
          previousScore = row.score; previousRank = rank;
          return { rank, nickname: (() => { const p = Array.isArray(row.players) ? row.players[0] : row.players; return p?.nickname + (p?.login_name ? '' : '（旧记录）'); })(),
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
    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (["/register", "/login", "/recover"].includes(path)) {
      const nickname = cleanName(typeof body.username === "string" ? body.username.normalize("NFKC") : null);
      const password = body.password;
      if (!nickname || !/^[\p{L}\p{N}_-]+$/u.test(nickname) || typeof password !== "string" || Array.from(password).length < 8 || new TextEncoder().encode(password).length > 72 || password.includes("\0")) return reply({ error: "用户名1至16字，仅限文字、数字、下划线；密码至少8字且不超过72字节" }, 400);
      const nameKey = nickname.toLowerCase();
      const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
      for (const [key, limit] of [["ip:" + ip, 30], ["name:" + nameKey, 10]] as const) {
        const { data, error } = await db.rpc("account_gate", { p_key: await hashToken(key), p_limit: limit });
        if (error) return reply({ error: "账号后台尚未升级，请先执行 accounts.sql 并部署新版函数" }, 503);
        if (!data) return reply({ error: "尝试过于频繁，请15分钟后再试" }, 429);
      }
      const newToken = crypto.randomUUID() + crypto.randomUUID();
      const recoveryCode = crypto.randomUUID() + crypto.randomUUID();
      const legacy = path === "/register" && typeof body.legacyId === "string" && token.length >= 32 && token.length <= 128;
      const { data, error } = await db.rpc("account_auth", {
        p_action: path.slice(1), p_name: nickname, p_key: nameKey, p_password: password,
        p_session: await hashToken(newToken), p_recovery: await hashToken(recoveryCode),
        p_old_recovery: typeof body.recoveryCode === "string" ? await hashToken(body.recoveryCode.trim()) : null,
        p_legacy_id: legacy ? body.legacyId : null, p_legacy_hash: legacy ? await hashToken(token) : null
      });
      if (error) throw error;
      if (!data?.ok) return reply({ error: data?.error || "登录失败" }, 400);
      return reply({ ...data, token: newToken, ...(path !== "/login" ? { recoveryCode } : {}) });
    }
    if (!["/me", "/scores", "/logout"].includes(path)) return reply({ error: "接口不存在" }, 404);
    if (token.length < 32 || token.length > 128) return reply({ error: "请先登录账号" }, 401);
    const tokenHash = await hashToken(token);
    const { data: session, error: authError } = await db.from("player_sessions").select("player_id,expires_at").eq("token_hash", tokenHash).maybeSingle();
    if (authError) throw authError;
    if (!session || session.expires_at <= Date.now()) return reply({ error: "登录已过期，请重新登录" }, 401);
    const { data: player, error: playerError } = await db.from("players").select("id,nickname,login_name").eq("id", session.player_id).maybeSingle();
    if (playerError) throw playerError;
    if (!player?.login_name) return reply({ error: "请注册账号" }, 401);
    if (path === "/logout") {
      const { error } = await db.from("player_sessions").delete().eq("token_hash", tokenHash);
      if (error) throw error;
      return reply({ ok: true });
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
    console.error("Leaderboard request failed:", "database operation failed");
    return reply({ error: "后台暂时不可用，请检查数据库及函数日志" }, 500);
  }
});
