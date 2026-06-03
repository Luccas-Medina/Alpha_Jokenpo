// Arquivo: public/modules/state.js
// Responsabilidade: Gerenciar o estado global da aplicação do lado do cliente.
// Centraliza as variáveis que precisam ser acessadas por diferentes módulos,
// como informações do usuário e a instância do socket.

// Importa as funções necessárias para reagir às mudanças de estado.
import { updateLoginState } from "./ui.js";
import { connectWebSocket } from "./websocket.js";

// Objeto 'session' que contém as variáveis de estado.
// Usar um objeto em vez de variáveis soltas facilita a importação
// e o gerenciamento do estado em um único lugar.
export const session = {
  socket: null, // Armazena a instância da conexão WebSocket.
  myUserId: null, // Guarda o ID do usuário logado.
  myUsername: null, // Guarda o nome do usuário logado.
  currentRoomCode: null, // Guarda o código da sala em que o jogador está.
};

/**
 * Verifica se existem dados de usuário no localStorage de uma sessão anterior.
 * Se sim, restaura o estado de "logado" e tenta reconectar.
 */
export function initializeSession() {
  // Obtém os dados do localStorage.
  const storedUserId = localStorage.getItem("userId");
  const storedUsername = localStorage.getItem("username");

  // Se os dados existirem, significa que o usuário estava logado antes de recarregar a página.
  if (storedUserId && storedUsername) {
    // Atualiza o estado global da sessão.
    session.myUserId = storedUserId;
    session.myUsername = storedUsername;
    // Atualiza a interface para refletir o estado de "logado".
    updateLoginState(true);
    // Inicia a conexão WebSocket.
    connectWebSocket();
  } else {
    // Caso contrário, garante que a UI esteja no estado "deslogado".
    updateLoginState(false);
  }
}
