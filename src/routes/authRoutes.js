// Importa o framework Express.
const express = require("express");
// Importa o controlador de autenticação, que contém a lógica das rotas.
const authController = require("../controllers/authController");
// Cria uma instância do Roteador do Express.
const router = express.Router();

// Define a rota para registro. Quando uma requisição POST chegar em '/register',
// a função authController.register será chamada.
router.post("/register", authController.register);

// Define a rota para login.
router.post("/login", authController.login);

// Define a rota para logout.
router.post("/logout", authController.logout);

// Exporta o roteador configurado para ser usado no arquivo principal do servidor.
module.exports = router;
