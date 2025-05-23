const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const port = 3000;

// Inicializa OpenAI com a chave da API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve arquivos estáticos (index.html, style.css, script.js)

// STEP 3: Doc Name – Identificar tipo de documento
app.post('/avaliar/doc-name', async (req, res) => {
  const { original } = req.body;

  const prompt = `

Idioma de origem: Português
Idioma de destino: Italiano

Você é um classificador de documentos oficiais. Seu trabalho é analisar o texto original fornecido abaixo e identificar com precisão o tipo de documento que ele representa. 
Você deve retornar apenas o nome do documento identificado, sem explicações adicionais.

Exemplos possíveis:
- Certidão de Nascimento
- Certidão de Casamento
- Histórico Escolar
- Diploma
- CNH (Carteira Nacional de Habilitação)
- CPF
- RG
- Passaporte

Texto original:
"""${original}"""
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const nomeDocumento = response.choices[0].message.content.trim();
    res.send(nomeDocumento);
  } catch (err) {
    console.error('Erro na etapa doc-name:', err);
    res.status(500).send('Erro ao identificar o nome do documento.');
  }
});


// STEP 4: Review Agent – Avaliação textual da tradução
app.post('/avaliar/review', async (req, res) => {
  const { original, traducao } = req.body;

  const prompt = `

      Você é um tradutor juramentado italiano, especialista em documentos oficiais.

      Sua tarefa é revisar o texto traduzido para o italiano como se fosse o documento final entregue, **sem consultar o original em português**.

      Você deve identificar:
      - Erros gramaticais ou de concordância
      - Vocabulário inadequado
      - Termos mal utilizados no contexto jurídico
      - Palavras mal escritas ou inexistentes no idioma italiano
      - Falta de naturalidade ou fluidez na redação

      ⚠️ Importante:
      - Analise apenas o texto em italiano como um documento isolado.
      - NÃO compare com o português.
      - Aja como se estivesse revisando um documento jurídico já traduzido para verificar sua conformidade linguística e legal.
      - NÃO invente erros.

      🧾 Formato de saída:
      - Para cada erro encontrado, use:
        "- Erro: [trecho em italiano] → [forma correta sugerida]"

      ✅ Se não houver erros, diga apenas:
      "Nenhum problema identificado."

      Texto traduzido (Italiano):
      """${traducao}"""

`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const reviewOutput = response.choices[0].message.content.trim();
    res.send(reviewOutput);
  } catch (err) {
    console.error('Erro na etapa review:', err);
    res.status(500).send('Erro ao revisar a tradução.');
  }
});

// STEP 5: Todo List Agent – Sugestões práticas de correção
app.post('/avaliar/todo', async (req, res) => {
  const { original, traducao } = req.body;

      const prompt = `
        
      Você é um tradutor juramentado especialista em traduções do português para o italiano.

Sua tarefa é comparar o texto original com a tradução fornecida, e retornar **somente as partes que exigem correção**, com base no seu conhecimento técnico e jurídico.

📌 Para cada erro, apresente:
- A frase **exatamente como foi escrita na tradução**
- Ao lado, a frase **corrigida**, como você entregaria oficialmente

⚠️ Regras:
- NÃO inclua trechos que estiverem corretos
- NÃO corrija nomes próprios, documentos, códigos, datas, e-mails ou números de identificação
- NÃO invente trechos que não existem na tradução fornecida
- Use **toda sua experiência como tradutor juramentado** para sugerir apenas o que for realmente necessário

🧾 Formato de saída:
- Texto incorreto: "[trecho da tradução]"
- Texto corrigido: "[forma correta que deveria estar]"

Exemplo:
- Texto incorreto: "mez di dicembre"
- Texto corrigido: "mese di dicembre"

✅ Se tudo estiver certo, diga:
"Nenhum ajuste necessário."

Texto original (Português):
"""${original}"""

Tradução fornecida (Italiano):
"""${traducao}"""


      `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const todoOutput = response.choices[0].message.content.trim();
    res.send(todoOutput);
  } catch (err) {
    console.error('Erro na etapa todo-list:', err);
    res.status(500).send('Erro ao gerar a lista de ajustes.');
  }
});

// STEP 6: Judge Agent – Veredito final da avaliação
app.post('/avaliar/judge', async (req, res) => {
  const { original, traducao } = req.body;

  const prompt = `

Idioma de destino: Italiano

Você é uma IA jurista especialista em análise de traduções de documentos oficiais para fins de imigração.

Sua tarefa é avaliar se a tradução fornecida está correta, fiel ao texto original, e com terminologias apropriadas para o tipo de documento.

      Texto original (Português):
      """${original}"""

      Tradução (Italiano):
      """${traducao}"""

CRITÉRIOS DE REJEIÇÃO OBRIGATÓRIA:
- Erros em nomes de pessoas
- Nomes digitados incorretamente
- Erros em números de documentos
- Terminologias incorretas dos títulos (ex: certidão, histórico, diploma)
- Termos incorretos para formações acadêmicas

AVALIAÇÃO DA NOTA:
- Comece com 100 pontos.
- Desconte 50 pontos ou mais para erros críticos.
- Desconte entre 5 e 20 pontos para erros leves ou pontos de atenção.
- Traduções com pequenos ajustes: nota entre 70 e 90.
- Traduções sem erros significativos: nota 100.

REGRAS DE DECISÃO:
- Se houver ao menos um erro crítico listado acima, o Resultado deve ser "Rejeitado".
- Se não houver erros críticos, mas existirem problemas leves ou pontos de atenção, o Resultado pode ser "Aprovado" com nota inferior a 100.
- Se tudo estiver correto, a tradução deve ser "Aprovada" com nota 100.

FORMATO DE SAÍDA ESPERADO (JSON):
{
  "nota": número de 0 a 100,
  "resultado": "Aprovado" ou "Rejeitado",
  "justificativa": "Texto explicativo claro"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const texto = response.choices[0].message.content;
    const match = texto.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('Resposta não contém JSON válido');

    const resultadoFinal = JSON.parse(match[0]);
    res.json(resultadoFinal);

  } catch (err) {
    console.error('Erro na etapa judge:', err);
    res.status(500).json({ error: 'Erro ao gerar veredito final.' });
  }
});


// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
