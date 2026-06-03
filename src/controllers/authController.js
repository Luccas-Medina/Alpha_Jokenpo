// Importa o modelo de usuário, que encapsula a lógica de interação com o banco de dados.
const User = require("../models/userModel");
// Importa a biblioteca jsonwebtoken para criar e verificar tokens JWT.
const jwt = require("jsonwebtoken");
// Carrega a chave secreta do JWT a partir das variáveis de ambiente.
const JWT_SECRET = process.env.JWT_SECRET;

// Função para lidar com o registro de novos usuários.
exports.register = async (req, res) => {
  // Extrai o nome de usuário e a senha do corpo da requisição HTTP.
  const { username, password } = req.body;
  // Validação básica para garantir que os campos obrigatórios foram enviados.
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Usuário e senha são obrigatórios." });
  }
  try {
    // Verifica se já existe um usuário com o mesmo nome.
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      // Retorna um status 409 (Conflict) se o usuário já existir.
      return res.status(409).json({ message: "Usuário já existe." });
    }
    // Cria o novo usuário no banco de dados.
    const newUser = await User.create({ username, password });

    // Gera um novo token JWT para o usuário recém-criado.
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username }, // Payload do token.
      JWT_SECRET, // Chave secreta para assinar o token.
      { expiresIn: "1h" } // Define o tempo de expiração do token.
    );

    // Define o token como um cookie na resposta HTTP.
    res.cookie("token", token, {
      httpOnly: true, // Impede que o cookie seja acessado por JavaScript no cliente (proteção XSS).
      secure: process.env.NODE_ENV === "production", // Garante que o cookie só seja enviado via HTTPS em produção.
      sameSite: "strict", // Ajuda a mitigar ataques CSRF.
      maxAge: 3600 * 1000, // Tempo de vida do cookie em milissegundos (1 hora).
    });

    // Envia uma resposta de sucesso (201 Created).
    res.status(201).json({
      message: "Usuário registrado e logado com sucesso!",
      user: { id: newUser.id, username: newUser.username },
    });
  } catch (error) {
    // Em caso de erro, loga a mensagem e envia uma resposta de erro genérica.
    console.error("Erro no registro:", error.message);
    if (error.message === "Nome de usuário já existe.") {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// Função para lidar com o login de usuários existentes.
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Usuário e senha são obrigatórios." });
  }
  try {
    // Busca o usuário pelo nome.
    const user = await User.findByUsername(username);
    // Se o usuário não for encontrado, retorna um erro de credenciais inválidas.
    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }
    // Compara a senha fornecida com o hash armazenado no banco de dados.
    const isMatch = await User.comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    // Se as credenciais estiverem corretas, gera e envia o token e o cookie.
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600 * 1000,
    });

    // Envia uma resposta de sucesso.
    res.json({
      message: "Login bem-sucedido!",
      userId: user.id,
      username: user.username,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// Função para lidar com o logout.
exports.logout = (req, res) => {
  // Para deslogar, o servidor instrui o navegador a remover o cookie.
  // Isso é feito enviando um cookie com o mesmo nome, mas com conteúdo vazio e data de expiração no passado.
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0), // Expira imediatamente.
  });
  res.status(200).json({ message: "Logout bem-sucedido." });
};
