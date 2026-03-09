-- Circle Chat: Real-time messaging within circles
-- Run this migration in Supabase SQL Editor

-- 1. Create circle_messages table
CREATE TABLE IF NOT EXISTS public.circle_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Index for efficient message loading (newest first per circle)
CREATE INDEX IF NOT EXISTS idx_circle_messages_circle_created
  ON public.circle_messages (circle_id, created_at DESC);

-- 3. Index for user's messages (useful for moderation / deletion)
CREATE INDEX IF NOT EXISTS idx_circle_messages_user
  ON public.circle_messages (user_id);

-- 4. Enable RLS
ALTER TABLE public.circle_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy: Members can read messages in their circles
CREATE POLICY "Circle members can read messages"
  ON public.circle_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = circle_messages.circle_id
        AND cm.user_id = auth.uid()
    )
  );

-- 6. RLS Policy: Members can send messages to their circles
CREATE POLICY "Circle members can send messages"
  ON public.circle_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = circle_messages.circle_id
        AND cm.user_id = auth.uid()
    )
  );

-- 7. Enable Supabase Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_messages;
