// Arquivo: public/modules/websocket.js
// Responsabilidade: Gerenciar a conexão WebSocket, incluindo o envio
// e o recebimento de mensagens.

// Importa o estado da sessão para armazenar a instância do socket.
import { session } from "./state.js";
// Importa a função de log para registrar todos os eventos de rede.
import {
  logEvent,
  updateLoginState,
  updateRoomUI,
  lockChoicesUI,
  displayRoundResult,
  unlockChoicesUI,
  resetToLobby,
  displayChatMessage,
  updateRematchStatus,
} from "./ui.js";

/**
 * Função wrapper para socket.send(). Garante que a mensagem seja logada antes de ser enviada.
 * Isso centraliza o envio de mensagens e o logging.
 * @param {object} messageObject - O objeto JavaScript a ser enviado como JSON.
 */
export function sendWebSocketMessage(messageObject) {
  // Verifica se a conexão WebSocket está aberta e pronta para enviar.
  if (!session.socket || session.socket.readyState !== WebSocket.OPEN) {
    logEvent(
      "SYSTEM_ERROR",
      "WebSocket não está conectado. Não foi possível enviar a mensagem."
    );
    return;
  }
  // Converte o objeto para uma string JSON.
  const messageString = JSON.stringify(messageObject);
  // Envia a mensagem.
  session.socket.send(messageString);
  // Loga o evento de envio.
  logEvent("SENT", messageObject);
}

/**
 * Estabelece a conexão WebSocket com o servidor e configura os handlers de eventos.
 */
export function connectWebSocket() {
  // Impede a criação de múltiplas conexões se uma já estiver aberta.
  if (session.socket && session.socket.readyState === WebSocket.OPEN) {
    logEvent("SYSTEM_INFO", "WebSocket já está conectado.");
    return;
  }

  // Determina o protocolo (ws ou wss) com base no protocolo da página (http ou https).
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Constrói a URL completa do endpoint WebSocket.
  const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

  // Cria uma nova instância de WebSocket, iniciando a conexão, e a armazena no estado global.
  session.socket = new WebSocket(wsUrl);

  // Define a função a ser chamada quando a conexão for aberta com sucesso.
  session.socket.onopen = () => {
    logEvent("SYSTEM_INFO", "Conexão WebSocket estabelecida com sucesso!");
  };

  // Define a função a ser chamada sempre que uma mensagem for recebida do servidor.
  session.socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    logEvent("RECEIVED", message);

    // Delega o tratamento da mensagem para a função roteadora.
    handleServerMessage(message);
  };

  // Define a função a ser chamada quando a conexão for fechada.
  session.socket.onclose = (event) => {
    logEvent(
      "SYSTEM_INFO",
      `Conexão WebSocket fechada. Código: ${event.code}, Motivo: "${
        event.reason || "N/A"
      }"`
    );
    // Limpa o estado local, forçando o usuário a fazer login novamente se a conexão cair.
    session.myUserId = null;
    session.myUsername = null;
    localStorage.clear();
    updateLoginState(false);
  };

  // Define a função a ser chamada em caso de erro na conexão.
  session.socket.onerror = (error) => {
    logEvent("SYSTEM_ERROR", "Ocorreu um erro na conexão WebSocket.", error);
    console.error("Erro no WebSocket:", error);
  };
}

/**
 * Roteador de mensagens do servidor. Chama a função apropriada com base no tipo da mensagem.
 * @param {object} message - A mensagem recebida do servidor.
 * @param {string} message.type - O tipo da mensagem que define a ação a ser tomada.
 * @param {object} message.payload - O conteúdo da mensagem. A estrutura deste objeto varia de acordo com o tipo da mensagem.
 */
function handleServerMessage(message) {
  // O switch direciona a ação com base no tipo da mensagem.
  switch (message.type) {
    case "ROOM_CREATED":
      // Se uma sala foi criada, atualiza a UI com o estado da sala.
      session.currentRoomCode = message.payload.roomCode;
      updateRoomUI(message.payload);
      break;
    case "PLAYER_JOINED":
      // Quando um jogador entra, também atualizamos a UI.
      session.currentRoomCode = message.payload.roomCode;
      updateRoomUI(message.payload);
      break;
    case "GAME_START":
      // Loga a mensagem de início, a UI já foi atualizada pelo PLAYER_JOINED.
      logEvent("SYSTEM_INFO", message.payload.message);
      break;
    case "CHOICE_MADE":
      // Quando o jogador faz uma escolha, bloqueia a UI para evitar novas escolhas.
      lockChoicesUI(message.payload.choice);
      break;
    case "GAME_RESULT":
      // Quando o jogo termina, exibe o resultado na UI.
      displayRoundResult(message.payload);
      break;
    case "NEW_ROUND":
      // Quando um novo round começa, desbloqueia a UI para fazer nova jogada.
      logEvent("SYSTEM_INFO", message.payload.message);
      unlockChoicesUI();
      break;
    case "OPPONENT_DISCONNECTED":
      logEvent("SYSTEM_INFO", message.payload.message);
      // Atualiza o texto da sala para refletir a ausência do oponente.
      roomInfoText.textContent += ` (${message.payload.username} desconectou)`;
      break;
    case "ROOM_STATE_UPDATE":
      session.currentRoomCode = message.payload.roomCode;
      updateRoomUI(message.payload);
      break;
    case "OPPONENT_RECONNECTED":
      logEvent("SYSTEM_INFO", message.payload.message);
      updateRoomUI(message.payload);
      break;
    case "CHAT_MESSAGE":
      displayChatMessage(message.payload);
      break;
    case "REMATCH_REQUESTED":
      updateRematchStatus(message.payload);
      break;
    case "ROOM_CLOSED":
      alert(message.payload.message);
      resetToLobby();
      break;
    case "ERROR":
      // Exibe mensagens de erro do servidor em um alerta.
      alert(`Erro do servidor: ${message.payload.message}`);
      break;
    // Outros casos serão adicionados nas próximas fases.
  }
}
