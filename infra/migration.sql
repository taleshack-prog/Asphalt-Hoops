-- Migration: adiciona grupos de chat e chat geral

-- Grupos de chat
CREATE TABLE IF NOT EXISTS chat_groups (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_group_members (
  group_id  INT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- Adiciona colunas na tabela de mensagens
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS group_id INT REFERENCES chat_groups(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_general BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_messages ALTER COLUMN match_id DROP NOT NULL;

-- Adiciona added_by nas quadras
ALTER TABLE courts ADD COLUMN IF NOT EXISTS added_by INT REFERENCES users(id);
