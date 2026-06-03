// Carrega as variáveis de ambiente do arquivo .env.
require("dotenv").config();
// Importa os módulos nativos e de pacotes necessários.
const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
const url = require("url");
const cookieParser = require("cookie-parser");
const cookie = require("cookie");

// Importa os módulos da nossa aplicação.
const authRoutes = require("./routes/authRoutes");
const { verifyTokenForWebSocket } = require("./middleware/authMiddleware");
const { initializeGameService } = require("./services/gameService");
const { log } = require("./utils/logger"); // Importa nosso logger centralizado.

// Cria a instância da aplicação Express.
const app = express();
// Define a porta a partir das variáveis de ambiente ou usa 3000 como padrão.
const PORT = process.env.PORT || 3000;

// Configuração dos middlewares do Express.
// Middleware para parsear o corpo de requisições com formato JSON.
app.use(express.json());
// Middleware para parsear cookies de requisições HTTP, tornando-os disponíveis em req.cookies.
app.use(cookieParser());
// Middleware para servir arquivos estáticos (HTML, CSS, JS do cliente) da pasta 'public'.
app.use(express.static(path.join(__dirname, "../public")));

// Monta as rotas de autenticação sob o prefixo '/api/auth'.
app.use("/api/auth", authRoutes);

// Cria um servidor HTTP a partir da nossa aplicação Express.
// O servidor WebSocket será "anexado" a este servidor HTTP.
const server = http.createServer(app);
// Cria uma instância do Servidor WebSocket com a opção `noServer: true`,
// o que nos dá controle manual sobre o processo de handshake (upgrade).
const wss = new WebSocket.Server({ noServer: true });

// Inicializa o serviço de jogo, passando a instância do servidor WebSocket.
initializeGameService(wss);

// Lógica de autenticação do WebSocket no evento 'upgrade'.
// Este evento é disparado pelo servidor HTTP quando um cliente tenta mudar de HTTP para WebSocket.
server.on("upgrade", async (request, socket, head) => {
  // Parseia a URL da requisição para verificar o endpoint.
  const pathname = url.parse(request.url).pathname;

  // Processa a requisição apenas se for para o nosso endpoint WebSocket '/ws'.
  if (pathname !== "/ws") {
    // Se não for, destrói o socket para recusar a conexão.
    socket.destroy();
    return;
  }

  // Tenta extrair o token do cookie da requisição de upgrade.
  let tokenFromCookie;
  try {
    const cookies = cookie.parse(request.headers.cookie || "");
    tokenFromCookie = cookies.token;
  } catch (e) {
    log("Erro ao parsear cookies durante o upgrade.", { data: e });
    socket.destroy();
    return;
  }

  // Verifica a validade do token JWT.
  const clientData = await verifyTokenForWebSocket(tokenFromCookie);

  // Se a verificação falhar (retornar null), o token é inválido ou ausente.
  if (!clientData) {
    log("Falha na autenticação WebSocket: Token inválido ou ausente.");
    // Envia uma resposta HTTP 401 Unauthorized e fecha a conexão.
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  // Se o token for válido, finaliza o handshake do WebSocket.
  wss.handleUpgrade(request, socket, head, (ws) => {
    // Anexa os dados do usuário (do payload do token) diretamente ao objeto 'ws'.
    // Isso torna a identidade do cliente facilmente acessível em todo o ciclo de vida da conexão.
    ws.clientId = clientData.userId;
    ws.clientUsername = clientData.username;

    // Loga o sucesso da autenticação.
    log("Handshake WebSocket bem-sucedido. Cliente autenticado.", { ws });

    // Emite o evento 'connection' padrão do 'ws', sinalizando que uma nova
    // conexão autenticada está pronta para ser usada pelo nosso gameService.
    wss.emit("connection", ws, request);
  });
});

// Inicia o servidor, que passará a ouvir por requisições na porta especificada.
server.listen(PORT, () => {
  log(`Servidor HTTP e WebSocket rodando na porta ${PORT}`);
});
