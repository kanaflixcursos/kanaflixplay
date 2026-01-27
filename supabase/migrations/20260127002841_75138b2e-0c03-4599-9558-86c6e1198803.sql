-- Add sequential access control field to courses
ALTER TABLE public.courses ADD COLUMN is_sequential BOOLEAN NOT NULL DEFAULT true;

-- Comment for documentation
COMMENT ON COLUMN public.courses.is_sequential IS 'If true, students must watch 90% of each lesson before unlocking the next one';