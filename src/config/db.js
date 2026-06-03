// Carrega as variáveis de ambiente do arquivo .env para process.env.
require("dotenv").config();
// Importa a classe Pool do pacote 'pg', que é o cliente PostgreSQL para Node.js.
const { Pool } = require("pg");

// Cria uma nova instância do Pool. O Pool gerencia um conjunto de conexões
// com o banco de dados, reutilizando-as para melhorar a performance e a resiliência.
const pool = new Pool({
  // A connectionString é uma URL única que contém todas as informações de conexão,
  // uma prática comum para serviços de banco de dados em nuvem.
  connectionString: process.env.URL_DB,
});

// Registra um "ouvinte" para o evento 'connect'.
// Este evento é disparado sempre que uma nova conexão é estabelecida com sucesso.
pool.on("connect", () => {
  console.log("Conectado ao PostgreSQL!");
});

// Registra um "ouvinte" para o evento 'error'.
// Captura erros de clientes ociosos no pool, como desconexões inesperadas.
pool.on("error", (err) => {
  console.error("Erro de conexão com o PostgreSQL:", err);
  // Encerra o processo da aplicação em caso de erro crítico de conexão.
  process.exit(1);
});

// Exporta o Pool.
// Isso cria uma interface simples e centralizada para executar consultas
// em outras partes da aplicação, sem precisar acessar o 'pool' diretamente.
module.exports = pool;
