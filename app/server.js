const express = require('express');
const app = express();

// Definição da porta (Lembrando que o seu Dockerfile expõe a porta 3000)
const PORT = 3000;

// Middleware para permitir que a aplicação entenda JSON
app.use(express.json());

// Rota Principal (Base)
app.get('/', (req, res) => {
    res.json({
        status: "sucesso",
        mensagem: "Hello World! A aplicação Node.js do ecossistema JEDi está online e operando perfeitamente.",
        timestamp: new Date().toISOString()
    });
});

// Inicialização do servidor escutando em '0.0.0.0' (Obrigatório para o Docker)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(`🚀 Servidor Node.js inicializado com sucesso!`);
    console.log(`📡 Escutando na porta interna: ${PORT}`);
    console.log(`==================================================`);
});