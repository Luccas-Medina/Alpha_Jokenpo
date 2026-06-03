// Arquivo: public/modules/auth.js
// Responsabilidade: Gerenciar todo o fluxo de autenticação via requisições HTTP (fetch).
// Lida com o registro, login e logout do usuário.

// Importa o estado da sessão para atualizá-lo após uma autenticação bem-sucedida.
import { session } from "./state.js";
// Importa as funções de UI para interagir com o DOM.
import { uiElements, updateLoginState } from "./ui.js";
// Importa a função de conexão WebSocket para ser chamada após o login.
import { connectWebSocket } from "./websocket.js";

/**
 * Função genérica para lidar com submissões de formulários de autenticação (login/registro).
 * Envia os dados para o endpoint especificado e atualiza o estado da aplicação sem recarregar a página.
 * @param {string} endpoint - A URL da API para a qual enviar a requisição.
 * @param {HTMLFormElement} form - O elemento do formulário que foi submetido.
 */
async function handleAuth(endpoint, form) {
  // Coleta os dados do formulário.
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    // Envia a requisição POST para o servidor.
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    // Parseia a resposta JSON.
    const result = await res.json();

    // Se a resposta não for bem-sucedida, exibe um alerta e interrompe a função.
    if (!res.ok) {
      alert(`Erro: ${result.message}`);
      return;
    }

    // Se a autenticação for bem-sucedida, atualiza o estado global da aplicação.
    session.myUserId = result.user?.id || result.userId;
    session.myUsername = result.user?.username || result.username;

    // Salva os dados no localStorage para que a sessão persista após um F5.
    localStorage.setItem("userId", session.myUserId);
    localStorage.setItem("username", session.myUsername);

    // Atualiza a interface para refletir o estado de "logado".
    updateLoginState(true);

    // Inicia a conexão WebSocket.
    connectWebSocket();

    // Limpa os campos do formulário após o sucesso.
    form.reset();
  } catch (err) {
    // Em caso de erro de rede, exibe um alerta.
    alert("Erro de conexão com o servidor.");
    console.error("Auth fetch error:", err);
  }
}

/**
 * Adiciona os "ouvintes" de evento aos formulários de login e registro,
 * e ao botão de logout.
 */
export function initializeAuth() {
  uiElements.registerForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Impede que a página recarregue.
    handleAuth("/api/auth/register", e.target);
  });

  uiElements.loginForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Impede que a página recarregue.
    handleAuth("/api/auth/login", e.target);
  });

  uiElements.logoutBtn.addEventListener("click", async () => {
    // Limpa o estado local primeiro para uma resposta de UI instantânea.
    session.myUserId = null;
    session.myUsername = null;
    localStorage.clear();
    updateLoginState(false); // Fecha o socket e atualiza a UI.

    // Em seguida, notifica o servidor para limpar o cookie de autenticação.
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      // Loga o erro caso o servidor não seja alcançado, mas a UI já foi atualizada.
      console.error("Erro ao notificar servidor sobre logout:", err);
    }
  });
}
