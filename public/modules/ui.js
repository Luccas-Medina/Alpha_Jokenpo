// Arquivo: public/modules/ui.js
// Responsabilidade: Controlar todas as interações com a interface do usuário (DOM).
// Este módulo contém todas as funções que leem ou escrevem nos elementos HTML,
// mantendo a lógica de UI separada da lógica de negócio.

// Importa o estado da sessão para obter informações do usuário ao atualizar a UI.
import { session } from "./state.js";

// Bloco de referências aos elementos do DOM para manipulação via JavaScript.
// Obtém cada elemento pelo seu ID para que possamos alterar seu conteúdo/visibilidade.
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authForms = document.getElementById("authForms");
const playerInfoContainer = document.getElementById("playerInfoContainer");
const playerInfo = document.getElementById("playerInfo");
const logoutBtn = document.getElementById("logoutBtn");
const gameContainer = document.getElementById("gameContainer");
const messagesDiv = document.getElementById("messages");

const roomActions = document.getElementById("roomActions");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomCodeInput = document.getElementById("roomCodeInput");
const gameArea = document.getElementById("gameArea");
const roomInfoText = document.getElementById("roomInfoText");
const choicesDiv = document.getElementById("choices");

const gameChoiceBtns = document.querySelectorAll(".game-choice-btn");

const closeRoomBtn = document.getElementById("closeRoomBtn");

const scoreboard = document.getElementById("scoreboard");
const scoreboardText = document.getElementById("scoreboardText");

const chatSection = document.getElementById("chatSection");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");

// Exporta as referências que serão usadas por outros módulos para adicionar event listeners.
export const uiElements = {
  loginForm,
  registerForm,
  logoutBtn,
  createRoomBtn,
  joinRoomBtn,
  roomCodeInput,
  gameChoiceBtns,
  closeRoomBtn,
  roomInfoText,
  chatInput,
  chatSendBtn,
};

/**
 * Função central de logging para a interface do usuário.
 * Cria e anexa um elemento visualmente formatado ao painel de mensagens,
 * indicando a direção e o conteúdo de cada evento.
 * @param {'SENT' | 'RECEIVED' | 'SYSTEM_INFO' | 'SYSTEM_ERROR'} type - O tipo de evento, para estilização.
 * @param {...any} data - Os dados a serem logados. Pode receber múltiplos argumentos.
 */
export function logEvent(type, ...data) {
  // Limpa a mensagem inicial de "Aguardando ações..." na primeira vez que um log é adicionado.
  if (messagesDiv.innerHTML.includes("Aguardando ações...")) {
    messagesDiv.innerHTML = "";
  }
  // Obtém a hora atual para o timestamp do log.
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  // Cria o elemento principal do log.
  const logEntry = document.createElement("div");

  // Variáveis para definir a cor e o texto do indicador do log.
  let indicatorClass = "";
  let indicatorText = "";

  // Define o estilo do indicador com base no tipo de evento.
  switch (type) {
    case "SENT":
      indicatorClass = "bg-blue-500";
      indicatorText = "↗️ ENVIADO";
      break;
    case "RECEIVED":
      indicatorClass = "bg-green-500";
      indicatorText = "↙️ RECEBIDO";
      break;
    case "SYSTEM_INFO":
      indicatorClass = "bg-gray-500";
      indicatorText = "⚙️ SISTEMA";
      break;
    case "SYSTEM_ERROR":
      indicatorClass = "bg-red-500";
      indicatorText = "❌ ERRO";
      break;
  }

  // Formata o conteúdo do log. Se for um objeto, converte para uma string JSON formatada.
  const content = data
    .map((d) => (typeof d === "string" ? d : JSON.stringify(d, null, 2)))
    .join("\n"); // Junta múltiplos argumentos com quebra de linha.

  // Define a estrutura HTML do log usando template literals.
  logEntry.className = "p-2 border-b text-sm font-mono flex items-start gap-3";
  logEntry.innerHTML = `
    <div class="flex-shrink-0">
      <div class="text-xs text-gray-500">${timestamp}</div>
      <div class="px-2 py-1 text-white text-xs font-bold rounded ${indicatorClass}">${indicatorText}</div>
    </div>
    <pre class="whitespace-pre-wrap break-all bg-gray-100 p-2 rounded flex-grow">${content}</pre>
  `;

  // Adiciona o novo log ao painel de mensagens.
  messagesDiv.appendChild(logEntry);
  // Rola o painel de mensagens para o final para mostrar o log mais recente.
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/**
 * Atualiza a interface do usuário para refletir o estado atual da sala de jogo.
 * @param {object} roomState - O objeto de estado da sala recebido do servidor.
 * @param {number} roomState.ownerId - O ID do usuário que criou a sala.
 * @param {string} roomState.roomCode - O código da sala.
 * @param {string} roomState.status - O status atual ('waiting' ou 'playing').
 * @param {string | null} [roomState.myChoice] - A escolha do usuário na sala ('rock', 'paper', 'scissors') ou null se ainda não fez uma escolha.
 * Obs: myChoice é usado para reconexão, pois o usuário pode ter feito uma escolha antes de perder a conexão.
 * @param {Array<{id: number, username: string}>} roomState.players - Uma lista dos jogadores na sala.
 */
export function updateRoomUI(roomState) {
  // Esconde a área de lobby (criar/entrar na sala).
  roomActions.classList.add("hidden");
  // Mostra a área principal do jogo.
  gameArea.classList.remove("hidden");

  // Constrói a lista de nomes de jogadores.
  const playerNames = roomState.players.map((p) => p.username).join(" vs ");

  // Atualiza o texto com as informações da sala.
  roomInfoText.textContent = `Sala: ${roomState.roomCode} | Status: ${roomState.status} | Jogadores: ${playerNames}`;

  // Mostra o botão de fechar sala APENAS se o usuário logado for o dono da sala.
  if (roomState.ownerId == session.myUserId) {
    uiElements.closeRoomBtn.classList.remove("hidden");
  } else {
    uiElements.closeRoomBtn.classList.add("hidden");
  }

  // Mostra ou esconde os botões de escolha (Pedra, Papel, Tesoura) com base no status do jogo.
  if (roomState.status === "playing") {
    choicesDiv.classList.remove("hidden");
  } else {
    choicesDiv.classList.add("hidden");
  }

  // Mostra o chat da sala.
  showChat();

  // Atualiza o placar de vitórias, se disponível no estado da sala.
  updateScoreboardUI(roomState.scores, roomState.players);

  // Lógica para habilitar ou bloquear os botões de escolha (Pedra, Papel, Tesoura)
  // (a parte do myChoice é usada na reconexão)
  // Se o jogo está em andamento e o usuário ainda não fez uma escolha,
  // desbloqueia os botões de escolha para permitir que ele jogue.
  // Caso contrário, bloqueia os botões e adiciona um feedback visual.
  const myChoice = roomState.myChoice;
  if (roomState.status === "playing" && !myChoice) {
    unlockChoicesUI();
  } else {
    lockChoicesUI(myChoice);
  }
}

/**
 * Desabilita os botões de escolha e adiciona um feedback visual
 * para indicar que a jogada do usuário foi registrada.
 * @param {string} chosen - A escolha feita pelo jogador ('rock', 'paper', 'scissors').
 */
export function lockChoicesUI(chosen) {
  uiElements.gameChoiceBtns.forEach((btn) => {
    btn.disabled = true;
    btn.classList.add("opacity-50");
    btn.classList.remove("border-green-500", "border-4");
    if (btn.dataset.choice === chosen) {
      btn.classList.add("border-green-500", "border-4");
    }
  });
}

/**
 * Reativa os botões de escolha para a próxima rodada, removendo o feedback visual.
 */
export function unlockChoicesUI() {
  uiElements.gameChoiceBtns.forEach((btn) => {
    btn.disabled = false;
    btn.classList.remove("opacity-50", "border-green-500", "border-4");
  });
  roomInfoText.textContent = `Sala: ${session.currentRoomCode} | Status: playing | Aguardando jogadas...`;
}

/**
 * Exibe o resultado da rodada na interface do usuário.
 * @param {object} resultPayload - O payload da mensagem GAME_RESULT.
 * @param {{[playerId: string]: string}} resultPayload.choices - Objeto que associa o id de cada jogador à sua escolha
 * @param {number | null} resultPayload.winnerId - O ID do jogador vencedor, ou null em empate.
 * @param {{[playerId: string]: string}} resultPayload.players - Objeto que associa o id de cada jogador ao seu nome de usuário.
 */
export function displayRoundResult(resultPayload) {
  const { choices, winnerId, players, scores } = resultPayload;
  let resultText;

  const choicesText = Object.entries(choices)
    .map(([playerId, choice]) => {
      const playerName = players[playerId];
      return `${playerName} escolheu ${choice}`;
    })
    .join("; ");

  if (winnerId === null) {
    resultText = "EMPATE!";
  } else if (winnerId == session.myUserId) {
    resultText = "VOCÊ VENCEU!";
  } else {
    resultText = "Você perdeu.";
  }

  roomInfoText.textContent = `Resultado: ${resultText} (${choicesText})`;

  // Atualiza o placar com os dados recebidos.
  updateScoreboardUI(scores, players);
}

/**
 * Atualiza o placar de vitórias na interface.
 * @param {Object<number, number>} scores - Objeto mapeando ID do jogador ao número de vitórias.
 * @param {Array<{id: number, username: string}> | Object<number, string>} players - Lista ou mapa de jogadores com nomes.
 */
function updateScoreboardUI(scores, players) {
  if (!scores || Object.keys(scores).length === 0) {
    scoreboard.classList.add("hidden");
    return;
  }
  scoreboard.classList.remove("hidden");

  const names = {};
  if (Array.isArray(players)) {
    players.forEach((p) => {
      names[p.id] = p.username;
    });
  } else {
    Object.assign(names, players);
  }

  const parts = Object.entries(scores).map(([id, wins]) => {
    const name = names[id] || `Jogador ${id}`;
    return `${name}: ${wins}`;
  });
  scoreboardText.textContent = `Placar: ${parts.join(" | ")}`;
}

/**
 * Mostra o chat e o limpa, chamado quando o jogador entra em uma sala.
 */
function showChat() {
  chatSection.classList.remove("hidden");
  chatMessages.innerHTML =
    '<p class="text-gray-500" id="chatPlaceholder">Chat da sala...</p>';
}

/**
 * Esconde o chat, chamado quando o jogador sai da sala.
 */
function hideChat() {
  chatSection.classList.add("hidden");
}

/**
 * Adiciona uma mensagem de chat recebida à interface.
 * @param {{ from: string, fromId: number, message: string, timestamp: string }} payload
 */
export function displayChatMessage(payload) {
  const placeholder = chatMessages.querySelector("#chatPlaceholder");

  if (placeholder) {
    placeholder.remove();
  }

  const time = new Date(payload.timestamp).toLocaleTimeString("pt-BR");
  const isMine = payload.fromId == session.myUserId;
  const alignment = isMine ? "text-right" : "text-left";
  const nameColor = isMine ? "text-blue-600" : "text-green-600";

  const entry = document.createElement("div");
  entry.className = `${alignment}`;
  entry.innerHTML = `
    <span class="text-xs text-gray-400">${time}</span>
    <span class="font-semibold ${nameColor}">${payload.from}:</span>
    <span>${payload.message}</span>
  `;
  chatMessages.appendChild(entry);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Reseta a interface do usuário para o estado de "Lobby",
 * como se o jogador nunca tivesse entrado em uma sala.
 */
export function resetToLobby() {
  // Mostra os controles de criar/entrar na sala.
  roomActions.classList.remove("hidden");
  // Esconde a área de jogo.
  gameArea.classList.add("hidden");
  // Esconde o placar.
  scoreboard.classList.add("hidden");
  // Esconde o chat.
  hideChat();
  // Reseta o código da sala atual no estado do cliente.
  session.currentRoomCode = null;
}

/**
 * Alterna a visibilidade dos elementos da UI com base no estado de login do usuário.
 * @param {boolean} isLoggedIn - True se o usuário está logado, false caso contrário.
 */
export function updateLoginState(isLoggedIn) {
  if (isLoggedIn) {
    // Se logado, esconde os formulários de autenticação.
    authForms.classList.add("hidden");
    // Exibe as informações do jogador e o container do jogo.
    playerInfo.textContent = `Logado como: ${session.myUsername} (ID: ${session.myUserId})`;
    playerInfoContainer.classList.remove("hidden");
    gameContainer.classList.remove("hidden");
  } else {
    // Se deslogado, exibe os formulários de autenticação.
    authForms.classList.remove("hidden");
    // Esconde as informações do jogador e o container do jogo.
    playerInfoContainer.classList.add("hidden");
    gameContainer.classList.add("hidden");
    // Se houver uma conexão WebSocket ativa, fecha ela.
    if (session.socket) session.socket.close();
  }
}
