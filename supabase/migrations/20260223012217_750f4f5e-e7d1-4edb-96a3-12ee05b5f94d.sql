-- Delete refund requests for this user
DELETE FROM public.refund_requests WHERE user_id = '69f67c7c-b260-4e28-944f-07df85d1f954';

-- Delete lesson progress
DELETE FROM public.lesson_progress WHERE user_id = '69f67c7c-b260-4e28-944f-07df85d1f954';

-- Delete course enrollments
DELETE FROM public.course_enrollments WHERE user_id = '69f67c7c-b260-4e28-944f-07df85d1f954';

-- Delete orders
DELETE FROM public.orders WHERE user_id = '69f67c7c-b260-4e28-944f-07df85d1f954';
