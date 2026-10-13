-- Run ONCE in Supabase SQL Editor for public LVK leaderboard.
-- Shows aggregated profits only, never exposes individual deal records.
-- Source: public.deals (cloud-synced LVK PRO trades).
-- This leaderboard reflects user-entered deals, not independently verified earnings.

CREATE OR REPLACE FUNCTION public.lvk_top_leaders()
RETURNS TABLE (user_id uuid, nickname text, profit_uah numeric, deals_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT d.user_id,
         COALESCE(NULLIF(p.nickname, ''), 'Участник ' || LEFT(d.user_id::text, 8))::text AS nickname,
         ROUND(SUM((d.amount::numeric / NULLIF(d.buy_rate::numeric, 0)) * d.sell_rate::numeric - d.amount::numeric - d.fee::numeric), 2) AS profit_uah,
         COUNT(*) AS deals_count
  FROM public.deals d
  LEFT JOIN public.shadow_profiles p ON p.user_id = d.user_id
  WHERE d.user_id IS NOT NULL
    AND d.amount > 0 AND d.buy_rate > 0 AND d.sell_rate > 0 AND d.fee >= 0
  GROUP BY d.user_id, p.nickname
  ORDER BY profit_uah DESC, deals_count DESC, d.user_id
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.lvk_top_leaders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lvk_top_leaders() TO anon, authenticated;
