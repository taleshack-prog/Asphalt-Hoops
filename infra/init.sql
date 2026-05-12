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

-- Seed: quadras públicas de Porto Alegre
INSERT INTO courts (name, address, city, lat, lng) VALUES
  ('Quadra da Redenção',        'Parque Farroupilha, s/n',        'Porto Alegre', -30.0353, -51.2177),
  ('Quadra do Parque Marinha',  'Av. Edvaldo Pereira Paiva, s/n', 'Porto Alegre', -30.0419, -51.2344),
  ('Quadra da Av. Ipiranga',    'Av. Ipiranga, 5811',             'Porto Alegre', -30.0629, -51.1755),
  ('Quadra do Parque Germânia', 'Av. Padre Cacique, s/n',         'Porto Alegre', -30.0633, -51.2189)
ON CONFLICT DO NOTHING;
