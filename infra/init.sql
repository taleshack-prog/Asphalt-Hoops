-- Schema Asphalt Hoops

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  invited_by  INT REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courts (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(150) NOT NULL,
  address   VARCHAR(255),
  city      VARCHAR(80),
  lat       NUMERIC(10, 7) NOT NULL,
  lng       NUMERIC(10, 7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id           SERIAL PRIMARY KEY,
  court_id     INT NOT NULL REFERENCES courts(id),
  created_by   INT NOT NULL REFERENCES users(id),
  modality     VARCHAR(10) NOT NULL DEFAULT '3x3', -- '3x3' | '5x5'
  scheduled_at TIMESTAMP NOT NULL,
  max_players  INT NOT NULL DEFAULT 6,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         SERIAL PRIMARY KEY,
  match_id   INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id),
  message    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed: 4 quadras públicas em São Paulo
INSERT INTO courts (name, address, city, lat, lng) VALUES
  ('Quadra do Ibirapuera',    'Av. Pedro Álvares Cabral, s/n',   'São Paulo', -23.5873, -46.6573),
  ('Quadra da Aclimação',     'R. Muniz de Souza, 1119',         'São Paulo', -23.5627, -46.6305),
  ('Quadra do Pacaembu',      'Praça Charles Miller, s/n',       'São Paulo', -23.5285, -46.6613),
  ('Quadra do Anhangabaú',    'Viaduto do Chá, s/n',             'São Paulo', -23.5458, -46.6394)
ON CONFLICT DO NOTHING;
