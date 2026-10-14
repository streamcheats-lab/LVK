-- LVK group management: run once in Supabase SQL Editor.
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS avatar_path text;
CREATE OR REPLACE FUNCTION public.lvk_can_manage_group(p_group uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.chat_groups g WHERE g.id=p_group AND (g.created_by=auth.uid() OR (g.is_system AND EXISTS(SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND lower(u.email)='streamcheats@gmail.com'))));
$$;
REVOKE ALL ON FUNCTION public.lvk_can_manage_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lvk_can_manage_group(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.lvk_group_update(p_group uuid,p_name text DEFAULT NULL,p_avatar_path text DEFAULT NULL,p_change_avatar boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.lvk_can_manage_group(p_group) THEN RAISE EXCEPTION 'Нет прав администратора'; END IF;
 IF p_name IS NOT NULL AND (length(trim(p_name)) < 1 OR length(p_name)>80) THEN RAISE EXCEPTION 'Недопустимое название'; END IF;
 IF p_change_avatar AND p_avatar_path IS NOT NULL AND (p_avatar_path !~ ('^'||p_group::text||'/[a-zA-Z0-9-]+\.(jpg|png|webp)$')) THEN RAISE EXCEPTION 'Недопустимый путь аватара'; END IF;
 UPDATE public.chat_groups SET name=coalesce(trim(p_name),name),avatar_path=CASE WHEN p_change_avatar THEN p_avatar_path ELSE avatar_path END WHERE id=p_group;
END $$;
REVOKE ALL ON FUNCTION public.lvk_group_update(uuid,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lvk_group_update(uuid,text,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.lvk_group_kick(p_group uuid,p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE creator uuid;
BEGIN
 IF NOT public.lvk_can_manage_group(p_group) THEN RAISE EXCEPTION 'Нет прав администратора'; END IF;
 SELECT created_by INTO creator FROM public.chat_groups WHERE id=p_group;
 IF p_user=auth.uid() OR p_user=creator THEN RAISE EXCEPTION 'Нельзя удалить себя или создателя группы'; END IF;
 DELETE FROM public.chat_members WHERE group_id=p_group AND user_id=p_user;
END $$;
REVOKE ALL ON FUNCTION public.lvk_group_kick(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lvk_group_kick(uuid,uuid) TO authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES ('lvk-group-avatars','lvk-group-avatars',true,2097152,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "LVK group avatars admin upload" ON storage.objects;
CREATE POLICY "LVK group avatars admin upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='lvk-group-avatars' AND public.lvk_can_manage_group((split_part(name,'/',1))::uuid));
-- Add administrator as member of system groups so they are visible in the chat list.
INSERT INTO public.chat_members(group_id,user_id)
SELECT g.id,u.id FROM public.chat_groups g CROSS JOIN auth.users u WHERE g.is_system=true AND lower(u.email)='streamcheats@gmail.com'
ON CONFLICT DO NOTHING;
