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

        Você é um tradutor juramentado com experiência em revisar traduções oficiais entre Português e Italiano. 

      Sua tarefa é identificar **erros ou inconsistências reais** na tradução fornecida. Avalie com cuidado se a tradução está fiel, correta e adequada ao contexto legal.

      Considere como erro:
      - Termos técnicos incorretos
      - Traduções literais que distorcem o sentido
      - Vocabulário inadequado ou impróprio
      - Nomes, datas, números mal traduzidos
      - Formatação errada em comparação com o original

      ⚠️ Muito importante:
      - NÃO apresente todas as frases traduzidas. 
      - Liste apenas os trechos onde HOUVE ERRO.
      - Evite elogiar ou dar notas.

      📌 Formato de saída:
      Para cada erro identificado, use o formato:
      - Erro encontrado

      🟢 Se não encontrar problemas, diga:
      "Nenhum problema identificado."

      Texto original (Português):
      """${original}"""

      Tradução (Italiano):
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
        Você é um revisor profissional de traduções juramentadas entre Português e Italiano.

        Tarefa:
        Analise o texto original e a tradução fornecida, e **gere uma lista de correções reais necessárias**.

        ❗ Importante:
        - NÃO invente palavras que não estão no texto.
        - Corrija somente quando houver divergência real.
        - NÃO corrija nomes próprios, números, e-mails, códigos, locais.
        - Se um trecho estiver correto, ignore.

        🔍 Procure erros de:
        - Vocabulário mal traduzido
        - Gramática inadequada
        - Termos técnicos incorretos
        - Concordância ou fluidez

        Formato:
        - Para cada erro, use:
          "- Correção necessária: '[trecho com problema]' -----> '[versão corrigida sugerida]'"

        - Se não houver problemas:
          "Nenhum ajuste necessário."

        Texto original (Português):
        """${original}"""

        Tradução (Italiano):
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
