async function executarAvaliacoes() {
  const original = document.getElementById('input-original').value.trim();
  const traducao = document.getElementById('input-traducao').value.trim();

  // Validação
  if (!original || !traducao) {
    alert('Por favor, preencha os dois campos.');
    return;
  }

  // Limpa e atualiza os campos de output
  document.getElementById('output-doc-name').textContent = 'Analisando...';
  document.getElementById('output-review').textContent = 'Analisando...';
  document.getElementById('output-todo').textContent = 'Analisando...';
  document.getElementById('output-judge').textContent = 'Analisando...';

  try {
    const resultados = {};

    // Step 3 – Doc Name
    const docName = await fetch('/avaliar/doc-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ original, traducao }),
    });
    resultados.docName = await docName.text();
    document.getElementById('output-doc-name').textContent = resultados.docName;

    // Step 4 – Review Agent
    const review = await fetch('/avaliar/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ original, traducao }),
    });
    resultados.review = await review.text();
    document.getElementById('output-review').textContent = resultados.review;

    // Step 5 – Todo List Agent
    const todo = await fetch('/avaliar/todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ original, traducao }),
    });
    resultados.todo = await todo.text();
    document.getElementById('output-todo').textContent = resultados.todo;

    // Step 6 – Judge Agent
    const judge = await fetch('/avaliar/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ original, traducao }),
    });
    const judgeData = await judge.json();
    document.getElementById('output-judge').textContent = `Nota: ${judgeData.nota}\nResultado: ${judgeData.resultado}\n\nJustificativa:\n${judgeData.justificativa}`;

  } catch (error) {
    console.error('Erro:', error);
    alert('Ocorreu um erro durante a avaliação. Verifique o console.');
  }
}
