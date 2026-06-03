// Importa a biblioteca jsonwebtoken.
const jwt = require("jsonwebtoken");
// Carrega a chave secreta a partir das variáveis de ambiente.
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifica a validade de um token JWT para autenticar uma conexão WebSocket.
 * Esta função é async e retorna o payload decodificado em caso de sucesso, ou null em caso de falha.
 * @param {string | undefined} token - O token JWT extraído do cookie.
 * @returns {Promise<object | null>} O payload do token se for válido, caso contrário null.
 */
exports.verifyTokenForWebSocket = async (token) => {
  // Se nenhum token for fornecido, a autenticação falha imediatamente.
  if (!token) {
    return null;
  }

  try {
    // Usa uma Promise para envolver a função jwt.verify, que é baseada em callback.
    // Isso permite que usemos a sintaxe async/await, tornando o código mais limpo.
    const decoded = await new Promise((resolve, reject) => {
      // Verifica a assinatura e a expiração do token.
      jwt.verify(token, JWT_SECRET, (err, decodedPayload) => {
        // Se houver um erro (ex: assinatura inválida, token expirado), a Promise é rejeitada.
        if (err) {
          return reject(err);
        }
        // Se for bem-sucedido, a Promise é resolvida com o conteúdo do token.
        resolve(decodedPayload);
      });
    });

    // Retorna o payload decodificado.
    // Ex: { userId: 1, username: 'fulano', iat: ..., exp: ... }
    return decoded;
  } catch (err) {
    // Captura erros da verificação (rejeição da Promise).
    console.error("Erro na verificação do token WebSocket:", err.message);
    // Retorna null para indicar que a autenticação falhou.
    return null;
  }
};