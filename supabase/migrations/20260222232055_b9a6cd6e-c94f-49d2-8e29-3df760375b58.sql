
INSERT INTO course_enrollments (user_id, course_id, expires_at)
VALUES ('2ea73461-b0a0-4014-b499-888d71981c21', '10000001', now() + interval '1 year')
ON CONFLICT (user_id, course_id) DO NOTHING;
