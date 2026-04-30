-- Profiles table for usernames (used for personal walls)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]{3,30}$')
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by anyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper: get profile id from username
CREATE OR REPLACE FUNCTION public.profile_id_by_username(_username text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.profiles WHERE username = _username LIMIT 1 $$;

-- Helper: is the caller the owner of profile?
CREATE OR REPLACE FUNCTION public.is_profile_owner(_profile_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _profile_id AND user_id = auth.uid()) $$;

-- Wall posts (per user wall)
CREATE TABLE public.wall_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wall_posts_profile_created ON public.wall_posts(profile_id, created_at DESC);

ALTER TABLE public.wall_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wall posts" ON public.wall_posts
  FOR SELECT USING (true);

CREATE POLICY "Anyone can write to a wall" ON public.wall_posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner can update wall posts" ON public.wall_posts
  FOR UPDATE TO authenticated
  USING (public.is_profile_owner(profile_id))
  WITH CHECK (public.is_profile_owner(profile_id));

CREATE POLICY "Owner or admin can delete wall posts" ON public.wall_posts
  FOR DELETE TO authenticated
  USING (public.is_profile_owner(profile_id) OR public.has_role(auth.uid(), 'admin'));

-- Wall notifications (notices from the wall owner)
CREATE TABLE public.wall_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wall_notif_profile ON public.wall_notifications(profile_id, created_at DESC);

ALTER TABLE public.wall_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wall notifications" ON public.wall_notifications
  FOR SELECT USING (true);

CREATE POLICY "Owner can insert wall notifications" ON public.wall_notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_profile_owner(profile_id));

CREATE POLICY "Owner can update wall notifications" ON public.wall_notifications
  FOR UPDATE TO authenticated
  USING (public.is_profile_owner(profile_id))
  WITH CHECK (public.is_profile_owner(profile_id));

CREATE POLICY "Owner or admin can delete wall notifications" ON public.wall_notifications
  FOR DELETE TO authenticated
  USING (public.is_profile_owner(profile_id) OR public.has_role(auth.uid(), 'admin'));

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wall_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wall_notifications;