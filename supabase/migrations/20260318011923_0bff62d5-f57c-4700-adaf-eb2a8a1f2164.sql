UPDATE course_enrollments
SET expires_at = enrolled_at + interval '1 year'
WHERE expires_at IS NULL;