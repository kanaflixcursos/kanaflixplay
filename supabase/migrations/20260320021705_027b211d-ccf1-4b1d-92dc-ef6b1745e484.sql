
UPDATE public.lead_forms
SET redirect_url = REPLACE(redirect_url, 'curso.kanaflix.com.br', 'cursos.kanaflix.com.br')
WHERE redirect_url LIKE '%curso.kanaflix.com.br%';
