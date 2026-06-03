// Importa a configuração de conexão com o banco de dados.
const db = require("../config/db");
// Importa a biblioteca bcryptjs para fazer o hash seguro de senhas.
const bcrypt = require("bcryptjs");

// O objeto 'User' agrupa todas as funções de acesso a dados para a entidade de usuário.
const User = {
  /**
   * Busca um usuário no banco de dados pelo seu nome de usuário.
   * @param {string} username - O nome de usuário a ser buscado.
   * @returns {Promise<object | undefined>} O objeto do usuário se encontrado, caso contrário undefined.
   */
  async findByUsername(username) {
    // Define a query SQL para selecionar o usuário. O '$1' é um placeholder para prevenir SQL Injection.
    const query = "SELECT * FROM users WHERE username = $1";
    try {
      // Executa a query no banco de dados.
      const { rows } = await db.query(query, [username]);
      // Retorna a primeira (e única) linha encontrada.
      return rows[0];
    } catch (error) {
      // Em caso de erro na consulta, loga o erro e o propaga para a camada superior.
      console.error("Erro ao buscar usuário por nome:", error);
      throw error;
    }
  },

  /**
   * Cria um novo usuário no banco de dados.
   * @param {object} user - O objeto contendo o nome de usuário e a senha.
   * @param {string} user.username - O nome do novo usuário.
   * @param {string} user.password - A senha em texto plano do novo usuário.
   * @returns {Promise<object>} O objeto do usuário recém-criado (sem o hash da senha).
   */
  async create({ username, password }) {
    // Gera um "salt" (uma string aleatória) para adicionar à senha antes do hash.
    // Isso garante que duas senhas iguais resultem em hashes diferentes.
    const salt = await bcrypt.genSalt(10);
    // Cria o hash da senha usando o salt. O '10' é o custo do hash (número de rounds).
    const passwordHash = await bcrypt.hash(password, salt);

    // Define a query de inserção. 'RETURNING' faz com que o PostgreSQL retorne os dados inseridos.
    const query = `
      INSERT INTO users (username, password_hash)
      VALUES ($1, $2)
      RETURNING id, username, created_at;
    `;
    try {
      // Executa a query de inserção com o nome e o hash da senha.
      const { rows } = await db.query(query, [username, passwordHash]);
      // Retorna o usuário recém-criado.
      return rows[0];
    } catch (error) {
      // Trata especificamente o erro de violação de chave única (usuário já existe).
      if (error.code === "23505") {
        // '23505' é o código de erro do PostgreSQL para unique_violation.
        throw new Error("Nome de usuário já existe.");
      }
      // Loga e propaga outros tipos de erro.
      console.error("Erro ao criar usuário:", error);
      throw error;
    }
  },

  /**
   * Compara uma senha em texto plano com um hash armazenado.
   * @param {string} candidatePassword - A senha enviada pelo usuário.
   * @param {string} passwordHash - O hash da senha armazenado no banco de dados.
   * @returns {Promise<boolean>} True se as senhas corresponderem, caso contrário false.
   */
  async comparePassword(candidatePassword, passwordHash) {
    // A função bcrypt.compare faz o hash da senha candidata com o mesmo salt do hash armazenado e compara os resultados.
    return bcrypt.compare(candidatePassword, passwordHash);
  },
};

// Exporta o modelo User para ser usado nos controladores.
module.exports = User;
