CREATE TABLE IF NOT EXISTS public.user_moderation (
  user_id uuid PRIMARY KEY,
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  paused_until timestamptz,
  permanently_paused boolean NOT NULL DEFAULT false,
  reason text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT moderation_pause_reason_length CHECK (reason IS NULL OR char_length(reason) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_user_moderation_profile_id ON public.user_moderation(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_active ON public.user_moderation(profile_id, paused_until) WHERE permanently_paused = true OR paused_until IS NOT NULL;

ALTER TABLE public.user_moderation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read moderation state" ON public.user_moderation;
CREATE POLICY "Anyone can read moderation state"
ON public.user_moderation
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert moderation" ON public.user_moderation;
CREATE POLICY "Admins can insert moderation"
ON public.user_moderation
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update moderation" ON public.user_moderation;
CREATE POLICY "Admins can update moderation"
ON public.user_moderation
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete moderation" ON public.user_moderation;
CREATE POLICY "Admins can delete moderation"
ON public.user_moderation
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT user_warning_message_length CHECK (char_length(message) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_user_warnings_profile_created ON public.user_warnings(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_warnings_user_created ON public.user_warnings(user_id, created_at DESC);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and admins can read warnings" ON public.user_warnings;
CREATE POLICY "Users and admins can read warnings"
ON public.user_warnings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert warnings" ON public.user_warnings;
CREATE POLICY "Admins can insert warnings"
ON public.user_warnings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can mark own warnings read" ON public.user_warnings;
CREATE POLICY "Users can mark own warnings read"
ON public.user_warnings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete warnings" ON public.user_warnings;
CREATE POLICY "Admins can delete warnings"
ON public.user_warnings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_user_paused(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_moderation
    WHERE profile_id = _profile_id
      AND (permanently_paused = true OR (paused_until IS NOT NULL AND paused_until > now()))
  )
$$;

DROP POLICY IF EXISTS "Anyone can write to a wall" ON public.wall_posts;
CREATE POLICY "Anyone can write to a wall"
ON public.wall_posts
FOR INSERT
WITH CHECK (NOT public.is_profile_paused(profile_id));

DROP POLICY IF EXISTS "Owner can update wall posts" ON public.wall_posts;
CREATE POLICY "Owner can update wall posts"
ON public.wall_posts
FOR UPDATE
TO authenticated
USING (public.is_profile_owner(profile_id) AND NOT public.is_profile_paused(profile_id))
WITH CHECK (public.is_profile_owner(profile_id) AND NOT public.is_profile_paused(profile_id));

DROP POLICY IF EXISTS "Owner or admin can delete wall posts" ON public.wall_posts;
CREATE POLICY "Owner or admin can delete wall posts"
ON public.wall_posts
FOR DELETE
TO authenticated
USING ((public.is_profile_owner(profile_id) AND NOT public.is_profile_paused(profile_id)) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owner can insert wall notifications" ON public.wall_notifications;
CREATE POLICY "Owner can insert wall notifications"
ON public.wall_notifications
FOR INSERT
TO authenticated
WITH CHECK (public.is_profile_owner(profile_id) AND NOT public.is_profile_paused(profile_id));

DROP POLICY IF EXISTS "Owner can update wall notifications" ON public.wall_notifications;
CREATE POLICY "Owner can update wall notifications"
ON public.wall_notifications
FOR UPDATE
TO authenticated
USING (public.is_profile_owner(profile_id) AND NOT public.is_profile_paused(profile_id))
WITH CHECK (public.is_profile_owner(profile_id) AND NOT public.is_profile_paused(profile_id));

DROP POLICY IF EXISTS "Owner or admin can delete wall notifications" ON public.wall_notifications;
CREATE POLICY "Owner or admin can delete wall notifications"
ON public.wall_notifications
FOR DELETE
TO authenticated
USING ((public.is_profile_owner(profile_id) AND NOT public.is_profile_paused(profile_id)) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND NOT public.is_user_paused(user_id))
WITH CHECK (auth.uid() = user_id AND NOT public.is_user_paused(user_id));

DROP TRIGGER IF EXISTS user_moderation_updated_at ON public.user_moderation;
CREATE TRIGGER user_moderation_updated_at
BEFORE UPDATE ON public.user_moderation
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();