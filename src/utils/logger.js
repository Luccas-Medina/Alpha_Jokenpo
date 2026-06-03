/**
 * Função de log centralizada para o servidor. Formata e exibe mensagens no console
 * com um timestamp e informações de contexto do cliente.
 * @param {string} message - A mensagem principal a ser logada.
 * @param {object} [context={}] - Informações contextuais opcionais.
 * @param {object} [context.ws] - A instância do WebSocket, de onde extraímos dados do cliente.
 * @param {string} [context.clientId] - O ID do cliente.
 * @param {string} [context.clientUsername] - O nome do cliente.
 * @param {any} [context.data] - Um objeto de dados a ser logado em formato JSON.
 */
function log(message, context = {}) {
  // Cria um timestamp formatado para a hora local.
  const timestamp = new Date().toLocaleTimeString();
  // String que conterá o contexto formatado.
  let contextString = "";

  // Verifica se a instância 'ws' foi passada no contexto.
  if (context.ws) {
    // Extrai as informações relevantes do objeto 'ws'.
    const { clientId, clientUsername, currentRoomCode } = context.ws;
    const parts = [];
    // Adiciona cada parte do contexto se ela existir.
    if (clientUsername) parts.push(`User: ${clientUsername}`);
    if (clientId) parts.push(`ID: ${clientId}`);
    if (currentRoomCode) parts.push(`Room: ${currentRoomCode}`);
    // Monta a string de contexto final.
    if (parts.length > 0) {
      contextString = ` [${parts.join(", ")}]`;
    }
  } else if (context.clientId || context.clientUsername) {
    // Fallback caso o objeto 'ws' não seja passado, mas os dados do cliente sim.
    const { clientId, clientUsername } = context;
    const parts = [];
    if (clientUsername) parts.push(`User: ${clientUsername}`);
    if (clientId) parts.push(`ID: ${clientId}`);
    if (parts.length > 0) {
      contextString = ` [${parts.join(", ")}]`;
    }
  }

  // Exibe a mensagem principal formatada no console.
  console.log(`${timestamp} - ${message}${contextString}`);

  // Se houver um objeto de dados no contexto, o exibe de forma indentada.
  // Isso é útil para logar payloads de mensagens.
  if (context.data) {
    console.log("  └─ Data:", JSON.stringify(context.data, null, 2));
  }
}

// Exporta a função de log para ser usada em toda a aplicação.
module.exports = { log };
