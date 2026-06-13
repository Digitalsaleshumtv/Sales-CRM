-- Run this once in Supabase SQL Editor
-- Creates the notifications table for the in-dashboard notification center

CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type          text NOT NULL,         -- 'new_deal' | 'new_followup' | 'new_meeting'
  title         text NOT NULL,
  body          text,
  recipient     text NOT NULL,         -- email of the recipient (e.g. hasan.akbar@hum.tv)
  is_read       boolean DEFAULT false,
  created_by_email text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Each user only sees notifications addressed to them
CREATE POLICY "select own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient = (auth.jwt() ->> 'email'));

-- Any authenticated user can insert a notification
CREATE POLICY "insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient = (auth.jwt() ->> 'email'));

-- Enable realtime so new notifications appear instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
