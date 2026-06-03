// Importa a classe WebSocket do pacote 'ws'.
const WebSocket = require("ws");
// Importa nosso utilitário de log centralizado.
const { log } = require("../utils/logger");

// =========================================================================
// ## O que é um Map? ##
//
// Pense em um Map como um dicionário ou um fichário super eficiente. Ele permite
// armazenar pares de "chave-valor", onde cada chave é única.
//
// Analogia: Se você tem um fichário de clientes (o Map), a "chave" pode ser
// o CPF de um cliente (único), e o "valor" pode ser a ficha completa com todos
// os dados desse cliente (nome, endereço, etc.).
//
// Diferente de um objeto comum (`{}`), um Map é otimizado para adições e
// remoções frequentes e pode usar qualquer tipo de dado como chave (não apenas strings).
//
// ### Métodos que Usaremos: ###
//
// 1. .set(chave, valor) -> Adiciona ou atualiza uma entrada no Map.
//    Exemplo:
//    const meuFichario = new Map();
//    meuFichario.set('123.456.789-00', { nome: 'João' });
//
// 2. .get(chave) -> Obtém o valor associado a uma chave.
//    Exemplo:
//    const fichaDoJoao = meuFichario.get('123.456.789-00'); // Retorna { nome: 'João' }
//
// 3. .has(chave) -> Verifica se uma chave existe no Map. Retorna true ou false.
//    Exemplo:
//    const temJoao = meuFichario.has('123.456.789-00'); // Retorna true
//
// 4. .delete(chave) -> Remove uma entrada do Map pela sua chave.
//    Exemplo:
//    meuFichario.delete('123.456.789-00');
//
// 5. .size -> Uma propriedade (não um método) que retorna o número de entradas no Map.
//    Exemplo:
//    const totalDeFichas = meuFichario.size;
//
// Usaremos `Map` para gerenciar tanto as salas (`rooms`) quanto os jogadores
// dentro de cada sala, pois é a estrutura de dados perfeita para isso.
// =========================================================================
/**
 * @type {Map<string, Room>}
 * Este Map global armazena todas as salas ativas do jogo.
 * Cada sala é identificada por um código único (`roomCode`),
 * que é a "chave" do Map, e o "valor" é um objeto `Room` (definido abaixo).
 */
const rooms = new Map();

/**
 * Define a estrutura de um objeto Room. Este objeto é armazenado como o "valor"
 * no Map global `rooms`, onde a "chave" é o `roomCode`.
 * @typedef {Object} Room
 * @property {string} roomCode - O código único da sala.
 * @property {Map<number, Player>} players - Mapeia o ID de cada jogador para seu objeto Player (definido abaixo).
 * @property {Set<number>} playerIds - Um conjunto com os IDs de todos os jogadores que já entraram na sala. Usado para reconexão.
 * Obs: Um Set se parece com um array, usaremos os seguintes métodos:
 * - add(id) para adicionar um ID.
 * - has(id) para verificar se um ID já está presente.
 * - delete(id) para remover um ID.
 * @property {number} ownerId - O ID do jogador que criou a sala.
 * @property {'waiting' | 'playing'} status - O estado atual da sala.
 * @property {Map<number, 'rock' | 'paper' | 'scissors'>} choices - Mapeia o ID do jogador à sua escolha na rodada atual.
 */

/**
 * Define a estrutura de um objeto Player. Este objeto é armazenado como o "valor"
 * no Map `room.players`, onde a "chave" é o ID do jogador.
 * @typedef {Object} Player
 * @property {WebSocket} ws - A instância da conexão WebSocket ativa do jogador.
 * @property {string} username - O nome do jogador, para exibição na UI.
 */

/**
 * Função wrapper para enviar uma mensagem a um cliente WebSocket específico.
 * Centraliza o envio, a conversão para JSON e o logging da ação.
 * @param {WebSocket} ws - A instância do cliente WebSocket de destino.
 * @param {string} type - O tipo da mensagem, que define a ação no cliente.
 * @param {object} payload - O objeto de dados a ser enviado.
 */
function sendToClient(ws, type, payload) {
  // Verifica se a conexão está aberta antes de tentar enviar.
  if (ws.readyState !== WebSocket.OPEN) {
    // Loga a tentativa de envio para uma conexão fechada, útil para depuração.
    log("Tentativa de envio para um WebSocket fechado.", {
      ws,
      data: { type, payload },
    });
    return;
  }

  // Monta o objeto da mensagem no formato padrão { type, payload }.
  const message = { type, payload };
  // Converte o objeto para uma string JSON e envia ao cliente.
  ws.send(JSON.stringify(message));

  // Loga a mensagem que acabou de ser enviada para fins de rastreamento.
  log(`Mensagem enviada para o cliente.`, { ws, data: message });
}

/**
 * Inicializa o serviço de jogo, configurando os listeners de eventos para o servidor WebSocket.
 * @param {WebSocket.Server} wss - A instância do servidor WebSocket.
 */
function initializeGameService(wss) {
  // Registra um "ouvinte" para o evento 'connection', que é disparado para cada cliente autenticado.
  wss.on("connection", (ws) => {
    // Tenta reconectar o jogador a uma sala existente antes de tratá-lo como uma nova conexão.
    const reconnected = attemptPlayerReconnection(ws);

    // Se o jogador não foi reconectado, então é uma nova conexão ao lobby.
    if (!reconnected) {
      log("Cliente conectado ao GameService (nova conexão).", { ws });
      // Envia a mensagem de boas-vindas padrão.
      sendToClient(ws, "WELCOME_NEW_CONNECTION", {
        message: `Bem-vindo, ${ws.clientUsername}! Você está conectado.`,
      });
    }

    // Registra um "ouvinte" para o evento 'message' nesta conexão específica.
    ws.on("message", (message) => {
      try {
        // Tenta parsear a mensagem recebida (que vem como string ou buffer) para JSON.
        const data = JSON.parse(message.toString());
        // Loga a mensagem recebida com sucesso.
        log("Mensagem recebida.", { ws, data });

        // Chama o roteador de mensagens para tratar a ação do cliente.
        handleClientMessage(ws, data);
      } catch (error) {
        // Em caso de erro no parse (mensagem malformada), loga o erro e a mensagem original.
        log("Erro ao parsear mensagem JSON.", {
          ws,
          data: { error: error.message, originalMessage: message.toString() },
        });
      }
    });

    // Registra um "ouvinte" para o evento 'close', disparado quando a conexão é encerrada.
    ws.on("close", () => {
      log("Cliente desconectado.", { ws });

      // Agora o 'close' chama o handler de desconexão.
      handlePlayerDisconnect(ws);
    });

    // Registra um "ouvinte" para o evento 'error'.
    ws.on("error", (error) => {
      log("Erro no WebSocket.", { ws, data: { error: error.message } });
    });
  });
}

/**
 * Roteia as mensagens recebidas do cliente para a função de tratamento apropriada.
 * @param {WebSocket} ws - A conexão do cliente que enviou a mensagem.
 * @param {object} data - O objeto da mensagem parseado.
 */
function handleClientMessage(ws, data) {
  // Validação básica do formato da mensagem.
  if (!data.type || !data.payload) {
    sendToClient(ws, "ERROR", { message: "Formato de mensagem inválido." });
    return;
  }

  // O switch direciona a ação com base no tipo da mensagem.
  switch (data.type) {
    case "CREATE_ROOM":
      handleCreateRoom(ws);
      break;
    case "JOIN_ROOM":
      handleJoinRoom(ws, data.payload);
      break;
    case "MAKE_CHOICE":
      handleMakeChoice(ws, data.payload);
      break;
    case "CLOSE_ROOM":
      handleCloseRoom(ws);
      break;
    // Outros tipos de mensagem serão adicionados nas próximas fases.
    default:
      sendToClient(ws, "ERROR", {
        message: `Tipo de mensagem desconhecido: ${data.type}`,
      });
  }
}

/**
 * Lida com a solicitação de um cliente para criar uma nova sala de jogo.
 * @param {WebSocket} ws - A conexão do cliente que está criando a sala.
 */
function handleCreateRoom(ws) {
  // Verifica se o jogador já está em uma sala.
  if (ws.currentRoomCode) {
    sendToClient(ws, "ERROR", { message: "Você já está em uma sala." });
    return;
  }

  // Gera um código de sala aleatório de 5 caracteres.
  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

  /**
   * Cria o novo objeto de sala.
   * @type {Room}
   */
  const room = {
    roomCode,
    // Lembrando que o Map irá armazenar os jogadores.
    // A chave é o ID do jogador e o valor é o objeto do jogador.
    players: new Map(),
    playerIds: new Set(), // Inicializa o Set para guardar os IDs dos jogadores.
    ownerId: ws.clientId, // O criador é o dono da sala.
    status: "waiting", // A sala começa aguardando o segundo jogador.
    choices: new Map(), // Inicializa o Map para armazenar as jogadas da rodada.
  };

  // Adiciona o ID do criador ao Set de IDs.
  room.playerIds.add(ws.clientId);

  // Adiciona o jogador criador ao mapa de jogadores da sala.
  room.players.set(ws.clientId, { ws, username: ws.clientUsername });

  // Armazena a nova sala no mapa global de salas.
  rooms.set(roomCode, room);

  // Associa o código da sala à conexão do jogador para referência futura.
  ws.currentRoomCode = roomCode;

  // Prepara o payload para enviar de volta ao cliente.
  const payload = {
    roomCode: room.roomCode,
    ownerId: room.ownerId,
    // A linha abaixo converte os valores do Map de jogadores em um array de objetos.
    // 1. `room.players.values()`: Retorna um "iterador" com todos os objetos Player no Map.
    // 2. `Array.from(...)`: Converte esse iterador em um array padrão: [ {ws, username}, ... ].
    // 3. `.map(p => ...)`: Transforma cada objeto Player em um objeto mais simples,
    //    contendo apenas os dados seguros para enviar ao cliente (ID e nome).
    players: Array.from(room.players.values()).map((p) => ({
      id: p.ws.clientId,
      username: p.username,
    })),
    status: room.status,
  };

  // Envia a confirmação de criação da sala para o cliente.
  sendToClient(ws, "ROOM_CREATED", payload);
  log(`Sala ${roomCode} criada por ${ws.clientUsername}.`, { ws });
}

/**
 * Lida com a solicitação de um cliente para entrar em uma sala existente.
 * @param {WebSocket} ws - A conexão do cliente que está tentando entrar.
 * @param {object} payload - O payload da mensagem, contendo o roomCode.
 * @param {string} payload.roomCode - O código da sala que o cliente deseja entrar.
 */
function handleJoinRoom(ws, payload) {
  // Extrai o código da sala do payload.
  const { roomCode } = payload;
  // Validação para garantir que um código foi fornecido.
  if (!roomCode) {
    sendToClient(ws, "ERROR", { message: "Código da sala não fornecido." });
    return;
  }

  // Verifica se o jogador já está em uma sala.
  if (ws.currentRoomCode) {
    sendToClient(ws, "ERROR", { message: "Você já está em uma sala." });
    return;
  }

  // Busca a sala no mapa de salas ativas.
  const room = rooms.get(roomCode);

  // Validações de lógica de negócio.
  if (!room) {
    sendToClient(ws, "ERROR", { message: "Sala não encontrada." });
    return;
  }
  if (room.players.size >= 2) {
    sendToClient(ws, "ERROR", { message: "A sala já está cheia." });
    return;
  }

  // Adiciona o ID do novo jogador ao Set de IDs da sala.
  room.playerIds.add(ws.clientId);

  // Se todas as validações passarem, adiciona o jogador à sala.
  room.players.set(ws.clientId, { ws, username: ws.clientUsername });
  ws.currentRoomCode = roomCode;

  // Atualiza o status da sala para 'playing' pois agora tem 2 jogadores.
  room.status = "playing";

  log(`${ws.clientUsername} entrou na sala ${roomCode}. O jogo vai começar.`, {
    ws,
  });

  // Prepara o payload com o estado atualizado da sala para notificar ambos os jogadores.
  const updatedRoomPayload = {
    roomCode: room.roomCode,
    ownerId: room.ownerId,
    // A linha abaixo converte os valores do Map de jogadores em um array de objetos.
    // 1. `room.players.values()`: Retorna um "iterador" com todos os objetos Player no Map.
    // 2. `Array.from(...)`: Converte esse iterador em um array padrão: [ {ws, username}, ... ].
    // 3. `.map(p => ...)`: Transforma cada objeto Player em um objeto mais simples,
    //    contendo apenas os dados seguros para enviar ao cliente (ID e nome).
    players: Array.from(room.players.values()).map((p) => ({
      id: p.ws.clientId,
      username: p.username,
    })),
    status: room.status,
  };

  // Notifica ambos os jogadores sobre a entrada e o início do jogo.
  // Como são apenas 2 jogadores, podemos notificá-los diretamente sem um loop complexo.
  room.players.forEach((player) => {
    // A mensagem PLAYER_JOINED informa quem entrou.
    sendToClient(player.ws, "PLAYER_JOINED", updatedRoomPayload);
    // A mensagem GAME_START sinaliza para a UI que o jogo pode começar.
    sendToClient(player.ws, "GAME_START", {
      message: "O jogo começou! Faça sua jogada.",
    });
  });
}

/**
 * Lida com a jogada (escolha) de um jogador.
 * @param {WebSocket} ws - A conexão do jogador que fez a jogada.
 * @param {object} payload - O payload da mensagem, contendo a escolha.
 * @param {'rock' | 'paper' | 'scissors'} payload.choice - A escolha do jogador.
 */
function handleMakeChoice(ws, payload) {
  const { choice } = payload;
  const room = rooms.get(ws.currentRoomCode);

  // --- Bloco de Validações ---
  if (!room) {
    return sendToClient(ws, "ERROR", { message: "Você não está em uma sala." });
  }
  if (room.status !== "playing") {
    return sendToClient(ws, "ERROR", {
      message: "O jogo não está em andamento.",
    });
  }
  if (!["rock", "paper", "scissors"].includes(choice)) {
    return sendToClient(ws, "ERROR", { message: "Escolha inválida." });
  }
  if (room.choices.has(ws.clientId)) {
    return sendToClient(ws, "ERROR", {
      message: "Você já fez sua escolha nesta rodada.",
    });
  }

  // Se todas as validações passarem, armazena a escolha.
  room.choices.set(ws.clientId, choice);
  log(`Jogador ${ws.clientUsername} escolheu ${choice}.`, { ws });

  // Envia uma confirmação individual para o jogador que fez a escolha.
  sendToClient(ws, "CHOICE_MADE", { choice });

  // Notifica o oponente que uma jogada foi feita, sem revelar qual foi.
  const opponent = getOpponent(room, ws.clientId);
  if (opponent) {
    sendToClient(opponent.ws, "OPPONENT_CHOICE_MADE", {
      message: "O oponente fez uma jogada.",
    });
  }

  // Verifica se a rodada terminou (ambos os jogadores fizeram suas escolhas).
  if (room.choices.size === 2) {
    processRoundResult(room);
  }
}

/**
 * Processa o resultado de uma rodada quando ambos os jogadores fizeram suas escolhas.
 * @param {Room} room - O objeto da sala de jogo.
 */
function processRoundResult(room) {
  // Pega os IDs dos jogadores e suas escolhas.
  const [player1Id, player2Id] = Array.from(room.choices.keys());
  const choice1 = room.choices.get(player1Id);
  const choice2 = room.choices.get(player2Id);

  // Determina o vencedor com base nas escolhas.
  const result = determineWinner(choice1, choice2);
  let winnerId = null;
  if (result === "player1") {
    winnerId = player1Id;
  } else if (result === "player2") {
    winnerId = player2Id;
  }

  log(
    `Resultado da rodada na sala ${room.roomCode}: Vencedor ID: ${
      winnerId || "Empate"
    }.`,
    { data: { choices: Object.fromEntries(room.choices) } }
  );

  // Prepara o payload com os resultados da rodada.
  const resultPayload = {
    choices: {
      [player1Id]: choice1,
      [player2Id]: choice2,
    },
    winnerId: winnerId,
    players: {
      [player1Id]: room.players.get(player1Id).username,
      [player2Id]: room.players.get(player2Id).username,
    },
  };

  // Envia o resultado da rodada para ambos os jogadores.
  room.players.forEach((player) => {
    sendToClient(player.ws, "GAME_RESULT", resultPayload);
  });

  // Agenda o início de uma nova rodada após um breve intervalo.
  setTimeout(() => {
    startNewRound(room);
  }, 10000);
}

/**
 * Inicia uma nova rodada do jogo na sala especificada.
 * @param {Room} room - O objeto da sala de jogo.
 */
function startNewRound(room) {
  log(`Iniciando nova rodada na sala ${room.roomCode}.`);

  // Limpa as escolhas para a próxima rodada.
  room.choices.clear();

  // Envia uma mensagem para todos os jogadores na sala informando sobre a nova rodada.
  room.players.forEach((player) => {
    sendToClient(player.ws, "NEW_ROUND", {
      message: "Nova rodada! Façam suas escolhas.",
    });
  });
}

/**
 * Lógica pura de regras do Jokenpô.
 * @param {string} choice1 - A escolha do primeiro jogador.
 * @param {string} choice2 - A escolha do segundo jogador.
 * @returns {'player1' | 'player2' | 'draw'} O resultado da rodada.
 */
function determineWinner(choice1, choice2) {
  if (choice1 === choice2) return "draw";
  if (
    (choice1 === "rock" && choice2 === "scissors") ||
    (choice1 === "scissors" && choice2 === "paper") ||
    (choice1 === "paper" && choice2 === "rock")
  ) {
    return "player1";
  }
  return "player2";
}

/**
 * Função utilitária para encontrar o oponente em uma sala de 2 jogadores.
 * @param {Room} room - O objeto da sala.
 * @param {number} currentPlayerId - O ID do jogador atual.
 * @returns {Player | undefined} O objeto Player do oponente, ou undefined se não for encontrado.
 */
function getOpponent(room, currentPlayerId) {
  // Itera sobre os jogadores na sala.
  for (const [playerId, player] of room.players.entries()) {
    // Se o ID do jogador no loop (playerId) não for igual
    // ao ID recebido (currentPlayerId), então playerId é o oponente
    // que estamos procurando. Retornamos ele.
    if (playerId !== currentPlayerId) {
      return player;
    }
  }
}

/**
 * Lida com a solicitação de fechamento de uma sala pelo seu dono.
 * @param {WebSocket} ws - A conexão do jogador que solicitou o fechamento.
 */
function handleCloseRoom(ws) {
  // Pega a sala atual do jogador.
  const room = rooms.get(ws.currentRoomCode);

  // Validações para garantir que o jogador pode fechar a sala.
  if (!room) {
    return sendToClient(ws, "ERROR", {
      message: "Você não está em uma sala para fechar.",
    });
  }
  if (room.ownerId !== ws.clientId) {
    return sendToClient(ws, "ERROR", {
      message: "Apenas o dono pode fechar a sala.",
    });
  }

  log(
    `Sala ${room.roomCode} está sendo fechada pelo dono ${ws.clientUsername}.`,
    { ws }
  );

  // Uma mensagem de fechamento para enviar a todos os jogadores na sala.
  const closePayload = {
    message: `A sala ${room.roomCode} foi fechada pelo dono.`,
  };

  // Envia a mensagem de fechamento para todos os jogadores na sala.
  room.players.forEach((player) => {
    sendToClient(player.ws, "ROOM_CLOSED", closePayload);
    // Limpa a referência do código da sala na conexão de cada jogador.
    player.ws.currentRoomCode = null;
  });

  // Remove a sala do Map global de salas ativas.
  rooms.delete(room.roomCode);
}

/**
 * Lida com a desconexão de um jogador.
 * @param {WebSocket} ws - A conexão do jogador que se desconectou.
 */
function handlePlayerDisconnect(ws) {
  // Pega a sala atual do jogador.
  const room = rooms.get(ws.currentRoomCode);

  if (!room) return;

  // Deleta o jogador do Map de jogadores da sala.
  room.players.delete(ws.clientId);

  log(
    `Jogador ${ws.clientUsername} removido da sala ${room.roomCode}. Jogadores ativos: ${room.players.size}.`
  );

  // Pega o oponente do jogador desconectado.
  // Se houver um oponente, notifica-o sobre a desconexão.
  const opponent = getOpponent(room, ws.clientId);
  if (opponent) {
    sendToClient(opponent.ws, "OPPONENT_DISCONNECTED", {
      username: ws.clientUsername,
      message: `${ws.clientUsername} se desconectou.`,
    });
  }
}

/**
 * Tenta reconectar um jogador a uma sala da qual ele se desconectou.
 * @param {WebSocket} ws - A nova conexão do jogador que está tentando se reconectar.
 * @returns {boolean} True se a reconexão foi bem-sucedida, false caso contrário.
 */
function attemptPlayerReconnection(ws) {
  // Vamos fazer um loop por todas as salas ativas.
  // Usamos `rooms.values()` para obter um iterador com todas as salas.
  // Queremos procurar se há uma sala onde o jogador estava anteriormente,
  // mas que ele não está mais conectado.
  for (const room of rooms.values()) {
    // Verifica se o ID do jogador está no Set de IDs da sala
    // (significando que ele é um dos dois jogadores que fundaram a sala),
    // mas não está no Map de players (ou seja, ele se desconectou).
    if (room.playerIds.has(ws.clientId) && !room.players.has(ws.clientId)) {
      log(`Reconectando ${ws.clientUsername} à sala ${room.roomCode}.`, { ws });

      // Vamos reconectar o jogador à sala.
      // Primeiro, associamos o código da sala à conexão do WebSocket.
      ws.currentRoomCode = room.roomCode;
      // Em seguida, adicionamos o jogador de volta ao Map de players da sala.
      room.players.set(ws.clientId, { ws, username: ws.clientUsername });

      // Mensagem para enviar ao jogador reconectado, para
      // informá-lo do estado atual da sala.
      const roomStatePayload = {
        roomCode: room.roomCode,
        ownerId: room.ownerId,
        players: Array.from(room.players.values()).map((p) => ({
          id: p.ws.clientId,
          username: p.username,
        })),
        status: room.status,
        myChoice: room.choices.get(ws.clientId) || null,
      };

      // Envia o estado da sala atualizado para o jogador reconectado.
      sendToClient(ws, "ROOM_STATE_UPDATE", roomStatePayload);

      // Pega o oponente do jogador reconectado e envia uma mensagem
      // informando da reconexão (se houver oponente online).
      const opponent = getOpponent(room, ws.clientId);
      if (opponent) {
        const opponentPayload = {
          // inclui todas as informações do estado da sala
          ...roomStatePayload,
          // mas troca o myChoice para o do oponente
          myChoice: room.choices.get(opponent.ws.clientId) || null,
          message: `${ws.clientUsername} reconectou-se.`,
        };
        sendToClient(opponent.ws, "OPPONENT_RECONNECTED", opponentPayload);
      }

      // Retorna true para sinalizar que a reconexão foi bem-sucedida.
      return true;
    }
  }

  // Se não encontramos uma sala onde o jogador estava, retornamos false
  // para sinalizar que a reconexão não foi possível (jogador não estava
  // em nenhuma sala)
  return false;
}

// Exporta as funções para serem usadas em outros módulos.
module.exports = { initializeGameService, sendToClient };
