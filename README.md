# Jokenpo Multiplayer

## O que é

Projeto fullstack de jogo de jokenpo multiplayer via websocket.

O projeto é implementado em 4 fases, cada fase corresponde a um commit.

## Para executar

- docker-compose up -d
- npm install
- npm run dev (ou npm start)

## Detalhes

- O docker-compose facilita subir o banco de dados, reparar que ele tem credenciais, o .env deve ter as mesmas credenciais (já tem)

- O init.sql cria o banco de dados e as tabelas. O docker-compose já executa o init.sql

- Execute npm install antes de executar o código

- Há duas maneiras de executar o código:
  - npm start
  - npm run dev (recarrega o backend sempre que há alteração no código)
