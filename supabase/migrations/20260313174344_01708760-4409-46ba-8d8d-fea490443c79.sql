-- ========================================
-- RESET: Limpar todos os dados transacionais
-- Manter apenas o usuário Rodrigo Silveiras (69f67c7c-b260-4e28-944f-07df85d1f954)
-- ========================================

-- 1. Limpar jornada/eventos
DELETE FROM user_events;
DELETE FROM site_visits;

-- 2. Limpar email opens e campanhas
DELETE FROM email_opens;
DELETE FROM email_campaigns;

-- 3. Limpar leads e formulários
DELETE FROM leads;
DELETE FROM lead_forms;

-- 4. Limpar vendas e reembolsos (ANTES dos cupons por FK)
DELETE FROM refund_requests;
DELETE FROM orders;

-- 5. Limpar cupons (agora sem FK bloqueando)
DELETE FROM discount_coupons;

-- 6. Limpar matrículas e progresso
DELETE FROM course_enrollments;
DELETE FROM lesson_progress;

-- 7. Limpar comentários
DELETE FROM lesson_comments;

-- 8. Limpar notificações
DELETE FROM notifications;

-- 9. Limpar tickets de suporte
DELETE FROM support_ticket_reads;
DELETE FROM support_ticket_messages;
DELETE FROM support_tickets;

-- 10. Limpar imported_users
DELETE FROM imported_users;

-- 11. Remover todos os profiles e user_roles EXCETO Rodrigo
DELETE FROM user_roles WHERE user_id != '69f67c7c-b260-4e28-944f-07df85d1f954';
DELETE FROM profiles WHERE user_id != '69f67c7c-b260-4e28-944f-07df85d1f954';