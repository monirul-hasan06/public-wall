CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notifications"
  ON public.notifications FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;