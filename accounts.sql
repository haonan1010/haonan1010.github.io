-- Run once in Supabase SQL Editor. Does not delete existing players or scores.
BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS login_name text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS recovery_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS players_login_unique ON public.players(login_name) WHERE login_name IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.player_sessions(token_hash text PRIMARY KEY, player_id text NOT NULL REFERENCES public.players(id) ON DELETE CASCADE, expires_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS player_sessions_owner ON public.player_sessions(player_id);
CREATE TABLE IF NOT EXISTS public.account_limits(bucket text PRIMARY KEY, attempts integer NOT NULL, expires_at bigint NOT NULL);
ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_sessions,public.account_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.player_sessions,public.account_limits TO service_role;

CREATE OR REPLACE FUNCTION public.account_gate(p_key text,p_limit integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer; now_ms bigint := (extract(epoch FROM clock_timestamp())*1000)::bigint;
BEGIN
 INSERT INTO public.account_limits AS a VALUES(p_key,1,now_ms+900000)
 ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN a.expires_at<now_ms THEN 1 ELSE a.attempts+1 END,expires_at=CASE WHEN a.expires_at<now_ms THEN now_ms+900000 ELSE a.expires_at END RETURNING attempts INTO n;
 DELETE FROM public.account_limits WHERE expires_at<now_ms-900000;
 RETURN n<=p_limit;
END $$;

-- Only the Edge Function's service role can call this transaction.
CREATE OR REPLACE FUNCTION public.account_auth(p_action text,p_name text,p_key text,p_password text,p_session text,p_recovery text,p_old_recovery text,p_legacy_id text,p_legacy_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE u public.players%ROWTYPE; now_ms bigint := (extract(epoch FROM clock_timestamp())*1000)::bigint;
BEGIN
 IF p_action NOT IN ('register','login','recover') OR char_length(p_name)<1 OR char_length(p_name)>16 OR p_key IS NULL OR p_key='' OR p_password IS NULL OR char_length(p_password)<8 OR octet_length(p_password)>72 THEN RETURN jsonb_build_object('error','用户名或密码格式错误'); END IF;
 IF p_action='register' THEN
  IF EXISTS(SELECT 1 FROM public.players WHERE login_name=p_key) THEN RETURN jsonb_build_object('error','用户名已被注册'); END IF;
  IF p_legacy_id IS NOT NULL THEN
   SELECT * INTO u FROM public.players WHERE id=p_legacy_id AND token_hash=p_legacy_hash AND login_name IS NULL FOR UPDATE;
   IF NOT FOUND THEN RETURN jsonb_build_object('error','旧身份无法验证，请取消迁移后注册'); END IF;
   UPDATE public.players SET login_name=p_key,nickname=p_name,password_hash=crypt(p_password,gen_salt('bf',12)),recovery_hash=p_recovery,token_hash=encode(gen_random_bytes(32),'hex') WHERE id=u.id;
  ELSE
   INSERT INTO public.players(id,token_hash,nickname,created_at,login_name,password_hash,recovery_hash) VALUES(gen_random_uuid()::text,encode(gen_random_bytes(32),'hex'),p_name,now_ms,p_key,crypt(p_password,gen_salt('bf',12)),p_recovery) RETURNING * INTO u;
  END IF;
 ELSE
  SELECT * INTO u FROM public.players WHERE login_name=p_key FOR UPDATE;
  IF NOT FOUND THEN
   PERFORM crypt(p_password,gen_salt('bf',12));
   RETURN jsonb_build_object('error','用户名、密码或恢复码不正确');
  END IF;
  IF p_action='login' THEN
   IF u.password_hash IS NULL OR crypt(p_password,u.password_hash)<>u.password_hash THEN RETURN jsonb_build_object('error','用户名、密码或恢复码不正确'); END IF;
  ELSE
   IF u.recovery_hash IS NULL OR p_old_recovery IS NULL OR u.recovery_hash<>p_old_recovery THEN RETURN jsonb_build_object('error','用户名、密码或恢复码不正确'); END IF;
   UPDATE public.players SET password_hash=crypt(p_password,gen_salt('bf',12)),recovery_hash=p_recovery WHERE id=u.id;
   DELETE FROM public.player_sessions WHERE player_id=u.id;
  END IF;
 END IF;
 DELETE FROM public.player_sessions WHERE expires_at<now_ms;
 INSERT INTO public.player_sessions(token_hash,player_id,expires_at) VALUES(p_session,u.id,now_ms+2592000000);
 RETURN jsonb_build_object('ok',true,'playerId',u.id,'nickname',CASE WHEN p_action='register' THEN p_name ELSE u.nickname END,'expiresAt',now_ms+2592000000);
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('error','用户名已被注册');
END $$;
REVOKE ALL ON FUNCTION public.account_gate(text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.account_auth(text,text,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.account_gate(text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.account_auth(text,text,text,text,text,text,text,text,text) TO service_role;
COMMIT;
