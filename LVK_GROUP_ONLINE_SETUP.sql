-- Run in Supabase SQL Editor. Lists membership IDs only for groups that the
-- requesting authenticated user belongs to. Used for live online counters.
CREATE OR REPLACE FUNCTION public.lvk_my_group_presence_members()
RETURNS TABLE(group_id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
 SELECT m.group_id, m.user_id
 FROM public.chat_members AS m
 WHERE auth.uid() IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM public.chat_members AS own
     WHERE own.group_id=m.group_id AND own.user_id=auth.uid()
   );
$$;
REVOKE ALL ON FUNCTION public.lvk_my_group_presence_members() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lvk_my_group_presence_members() TO authenticated;

-- Enable authenticated users to exchange ephemeral Presence state on the
-- LVK presence channel. Only user IDs are broadcast, never trade data.
DO $$ BEGIN
 CREATE POLICY "LVK authenticated presence" ON realtime.messages
 FOR ALL TO authenticated
 USING (realtime.topic() = 'lvk-presence-v1')
 WITH CHECK (realtime.topic() = 'lvk-presence-v1');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
