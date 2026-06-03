// Arquivo: public/modules/game.js
// Responsabilidade: Gerenciar as interações do usuário relacionadas ao jogo,
// como criar, entrar em uma sala e, futuramente, fazer uma jogada.

// Importa a função de envio de mensagens para o servidor.
import { sendWebSocketMessage } from "./websocket.js";
// Importa as referências aos elementos da UI.
import { uiElements } from "./ui.js";

/**
 * Adiciona os "ouvintes" de evento aos botões de ação do jogo (Lobby).
 */
export function initializeGameActions() {
  // Adiciona um "ouvinte" ao botão de criar sala.
  uiElements.createRoomBtn.addEventListener("click", () => {
    // Envia a mensagem para o servidor solicitando a criação de uma sala.
    sendWebSocketMessage({ type: "CREATE_ROOM", payload: {} });
  });

  // Adiciona um "ouvinte" ao botão de entrar na sala.
  uiElements.joinRoomBtn.addEventListener("click", () => {
    // Obtém, limpa e formata o código da sala do campo de input.
    const roomCode = uiElements.roomCodeInput.value.trim().toUpperCase();
    // Valida se um código foi digitado.
    if (!roomCode) {
      alert("Por favor, digite um código de sala.");
      return;
    }
    // Envia a mensagem para o servidor solicitando a entrada na sala.
    sendWebSocketMessage({ type: "JOIN_ROOM", payload: { roomCode } });
    // Limpa o campo de input.
    uiElements.roomCodeInput.value = "";
  });

  // Adiciona um "ouvinte" de clique para cada botão de escolha do jogo.
  uiElements.gameChoiceBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Obtém a escolha ('rock', 'paper', ou 'scissors') a partir do atributo data-choice do botão.
      const choice = btn.dataset.choice;
      // Envia a escolha para o servidor.
      sendWebSocketMessage({ type: "MAKE_CHOICE", payload: { choice } });
    });
  });

  // Adiciona um "ouvinte" ao botão de fechar sala.
  uiElements.closeRoomBtn.addEventListener("click", () => {
    // Pergunta ao usuário para confirmar a ação, pois ela é destrutiva.
    if (confirm("Tem certeza que deseja fechar esta sala para todos?")) {
      sendWebSocketMessage({ type: "CLOSE_ROOM", payload: {} });
    }
  });

  // Adiciona um "ouvinte" ao botão de enviar chat.
  uiElements.chatSendBtn.addEventListener("click", sendChatMessage);
  // Adiciona um "ouvinte" para enviar chat ao pressionar Enter.
  uiElements.chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendChatMessage();
    }
  });

  // Adiciona um "ouvinte" ao botão de Jogar Novamente (revanche).
  uiElements.rematchBtn.addEventListener("click", () => {
    sendWebSocketMessage({ type: "REQUEST_REMATCH", payload: {} });
  });
}

/**
 * Envia uma mensagem de chat para o servidor.
 */
function sendChatMessage() {
  const message = uiElements.chatInput.value.trim();
  if (!message) return;
  sendWebSocketMessage({ type: "SEND_CHAT", payload: { message } });
  uiElements.chatInput.value = "";
}
