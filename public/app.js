// Arquivo: public/app.js
// Responsabilidade: Ponto de entrada principal do lado do cliente.
// Este arquivo orquestra a inicialização da aplicação, importando e
// configurando os outros módulos (UI, Autenticação, WebSocket).

// Importa a função de inicialização do módulo de autenticação.
import { initializeAuth } from "./modules/auth.js";
// Importa a função que lida com o estado inicial da página (verificar se já está logado).
import { initializeSession } from "./modules/state.js";
// Importa a função que inicializa as ações de jogo (criar/entrar na sala).
import { initializeGameActions } from "./modules/game.js";

// Adiciona um "ouvinte" de evento que é acionado quando o DOM da página está completamente carregado.
// Este é o ponto de partida de toda a lógica do frontend.
window.addEventListener("DOMContentLoaded", () => {
  // Inicializa os event listeners para os formulários de login e registro, e botão logout.
  initializeAuth();
  // Inicializa os event listeners para as ações de jogo (criar/entrar na sala).
  initializeGameActions();
  // Verifica se há uma sessão ativa no localStorage e atualiza a UI e a conexão de acordo.
  initializeSession();
});
