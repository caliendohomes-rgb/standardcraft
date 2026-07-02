-- Lesson-plan suggestions submitted by registered users.
-- Powers the "Partner with StandardCraft — shape the roadmap" feature.

CREATE TABLE IF NOT EXISTS public.lesson_suggestions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  subject      TEXT,
  grade_level  TEXT,
  standard     TEXT,
  description  TEXT        NOT NULL,
  upvotes      INTEGER     NOT NULL DEFAULT 0,
  status       TEXT        NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'reviewing', 'planned', 'published', 'declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lesson_suggestions_user_id_idx ON public.lesson_suggestions (user_id);
CREATE INDEX IF NOT EXISTS lesson_suggestions_status_idx  ON public.lesson_suggestions (status);

ALTER TABLE public.lesson_suggestions ENABLE ROW LEVEL SECURITY;

-- Users may read their own suggestions. Inserts go through the server-side API
-- (service role), so no INSERT policy for the authenticated role is needed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lesson_suggestions'
      AND policyname = 'lesson_suggestions_select_own'
  ) THEN
    CREATE POLICY "lesson_suggestions_select_own" ON public.lesson_suggestions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
