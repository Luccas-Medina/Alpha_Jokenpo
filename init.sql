-- Habilitar a extensão para UUIDs, caso seja usada em outros contextos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela para armazenar os dados dos usuários
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);