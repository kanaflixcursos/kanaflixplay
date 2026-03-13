-- Remover usuários do auth (exceto Rodrigo) usando admin API interna
-- Estes usuários já tiveram seus dados de profiles/roles limpos na migration anterior
DELETE FROM auth.identities WHERE user_id IN (
  '1e31498a-0e5f-49f5-b0ec-a4c9478901fb',
  '92e6764f-bc12-4ef0-a298-5ee40f7b628f',
  '1c696ac3-15e5-47d7-a542-f68c6a146be5'
);
DELETE FROM auth.sessions WHERE user_id IN (
  '1e31498a-0e5f-49f5-b0ec-a4c9478901fb',
  '92e6764f-bc12-4ef0-a298-5ee40f7b628f',
  '1c696ac3-15e5-47d7-a542-f68c6a146be5'
);
DELETE FROM auth.refresh_tokens WHERE session_id IN (
  SELECT id FROM auth.sessions WHERE user_id IN (
    '1e31498a-0e5f-49f5-b0ec-a4c9478901fb',
    '92e6764f-bc12-4ef0-a298-5ee40f7b628f',
    '1c696ac3-15e5-47d7-a542-f68c6a146be5'
  )
);
DELETE FROM auth.mfa_factors WHERE user_id IN (
  '1e31498a-0e5f-49f5-b0ec-a4c9478901fb',
  '92e6764f-bc12-4ef0-a298-5ee40f7b628f',
  '1c696ac3-15e5-47d7-a542-f68c6a146be5'
);
DELETE FROM auth.users WHERE id IN (
  '1e31498a-0e5f-49f5-b0ec-a4c9478901fb',
  '92e6764f-bc12-4ef0-a298-5ee40f7b628f',
  '1c696ac3-15e5-47d7-a542-f68c6a146be5'
);