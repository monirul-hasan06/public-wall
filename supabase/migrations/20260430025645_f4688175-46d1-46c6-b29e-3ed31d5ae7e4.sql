CREATE OR REPLACE FUNCTION public.profile_id_by_username(_username text)
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT id FROM public.profiles WHERE username = _username LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.is_profile_owner(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _profile_id AND user_id = auth.uid()) $$;