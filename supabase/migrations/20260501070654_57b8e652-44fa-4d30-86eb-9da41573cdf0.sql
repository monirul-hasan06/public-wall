CREATE OR REPLACE FUNCTION public.is_user_paused(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_moderation
    WHERE user_id = _user_id
      AND (permanently_paused = true OR (paused_until IS NOT NULL AND paused_until > now()))
  )
$$;

CREATE OR REPLACE FUNCTION public.is_profile_paused(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_moderation
    WHERE profile_id = _profile_id
      AND (permanently_paused = true OR (paused_until IS NOT NULL AND paused_until > now()))
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.profile_id_by_username(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profile_id_by_username(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.profile_id_by_username(text) FROM authenticated;