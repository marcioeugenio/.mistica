import tarotDeck from "../../lib/tarotDeck";

export default async function handler(req, res) {
  const { message, userId = "default", historico = [], etapa = 0, respostasExtras = 0 } = req.body;
  const userMessage = message.toLowerCase();
  let novaEtapa = etapa;
  let novaRespostasExtras = respostasExtras;

  const frasesPagamento = ["paguei", "fiz o pix", "realizei o pagamento", "comprei"];
  const pagamentoDetectado = frasesPagamento.some(f => userMessage.includes(f));

  // Função para sortear a primeira carta dos Arcanos Maiores
  const arcanosMaiores = [
    "O Louco", "O Mago", "A Sacerdotisa", "A Imperatriz", "O Imperador", "O Hierofante",
    "Os Enamorados", "O Carro", "A Força", "O Eremita", "A Roda da Fortuna", "A Justiça",
    "O Enforcado", "A Morte", "A Temperança", "O Diabo", "A Torre", "A Estrela", "A Lua",
    "O Sol", "O Julgamento", "O Mundo"
  ];

  const sortearPrimeiraCarta = () => {
    const cartaEscolhida = arcanosMaiores[Math.floor(Math.random() * arcanosMaiores.length)];
    return cartaEscolhida;
  };

  const respostaIA = async (entrada) => {
    const completions = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Você é Mística, uma sacerdotisa espiritual que responde com linguagem simbólica, intuitiva e mística." },
          { role: "user", content: entrada }
        ]
      })
    });
    const data = await completions.json();
    return data.choices[0].message.content;
  };

  if (etapa === 0) {
    novaEtapa = 1;
    return res.status(200).json({
      etapa: novaEtapa, respostasExtras: 0, sequencia: [
        { texto: "✨ Bem-vindo ao oráculo de Mística.", delay: 1000 },
        { texto: "Deseja receber uma carta gratuita de orientação espiritual?", delay: 1500 }
      ]
    });
  }

  if (etapa === 1) {
    if (userMessage.includes("sim")) {
      const carta = sortearPrimeiraCarta(); // Sorteio com filtro para Arcanos Maiores
      novaEtapa = 3;
      return res.status(200).json({
        etapa: novaEtapa, respostasExtras: 0, sequencia: [
          { texto: `A carta que saiu para você foi <strong>${carta}</strong>:<br><img src="/tarot/${carta.replace(" ", "-")}.jpg" width="120">`, delay: 2000 },
          { texto: `Esta carta reflete sua jornada atual. Ela nos fala de um momento de <em>${tarotDeck[carta].normal}</em>. A presença dessa carta pode ser um sinal de que você está em um ponto decisivo da sua vida. Como você está sentindo essas energias agora?`, delay: 3000 },
          { texto: "Como você está se sentindo no momento? Está enfrentando algum desafio pessoal?", delay: 2500 }
        ]
      });
    } else {
      const resposta = await respostaIA(userMessage);
      return res.status(200).json({ etapa, respostasExtras, sequencia: [{ texto: resposta, delay: 1500 }] });
    }
  }

  if (etapa === 3) {
    novaEtapa = 4;
    let mensagemAdicional = "";

    if (userMessage.includes("cansado") || userMessage.includes("pobre")) {
      mensagemAdicional = "Eu entendo, esses desafios podem pesar em sua jornada. O fato de você estar cansado pode ser um sinal de que você precisa de mais equilíbrio em sua vida. Às vezes, é necessário parar e reavaliar as escolhas feitas, para poder avançar com mais clareza e propósito.";
    } else if (userMessage.includes("desafio") || userMessage.includes("problemas")) {
      mensagemAdicional = "Passar por dificuldades pode ser doloroso, mas é importante lembrar que esses momentos são oportunidades para crescimento. Tente focar nas lições que essas experiências podem trazer e busque a força para continuar avançando.";
    }

    return res.status(200).json({
      etapa: novaEtapa, respostasExtras: 0, sequencia: [
        { texto: mensagemAdicional, delay: 2000 },
        {
          texto: "Escolha um dos caminhos espirituais:<br><br>1 - Visão Mística (3 cartas) - R$39,90<br>2 - Pacote Místico Completo (5 cartas) - R$69,90<br><br>Após o pagamento, digite 1 ou 2 para iniciar.",
          delay: 2500
        }
      ]
    });
  }

  if (etapa === 4) {
    novaEtapa = 5;
    return res.status(200).json({
      etapa: novaEtapa, respostasExtras: 0, sequencia: [
        {
          texto: "🌑 A sessão gratuita foi encerrada. Para novas revelações, selecione um dos caminhos místicos e realize o pagamento.",
          delay: 2000
        }
      ]
    });
  }

  if (etapa === 5 && (message.includes("1") || message.includes("2") || await respostaIA(userMessage).then(r => r.toLowerCase().includes("paguei")))) {
    novaEtapa = 6;
    novaRespostasExtras = 0;

    const total = message.includes("2") ? 5 : 3;
    const filtro = message.includes("2") ? "todos" : "maiores"; // Usar "todos" para o pacote de 5 cartas

    const cartas = [];
    const usadas = new Set();
    while (cartas.length < total) {
      const carta = sortearCarta(filtro); // Sorteio com base no filtro
      if (!usadas.has(carta)) {
        usadas.add(carta);
        cartas.push(carta);
      }
    }

    const resumos = cartas.map((c, i) => `Carta ${i + 1}: ${c} - ${tarotDeck[c].normal}`).join("\n");
    const finalMsg = await respostaIA(resumos);

    const sequencia = cartas.flatMap((carta, i) => [
      { texto: `Carta ${i + 1}: <strong>${carta}</strong><br><img src="/tarot/${c.replace(" ", "-")}.jpg" width="120">`, delay: 1000 },
      { texto: `<em>${tarotDeck[carta].normal}</em>`, delay: 3000 }
    ]);

    sequencia.push({ texto: `🔮 Mística está conectando com as forças superiores...`, delay: 1500 });
    sequencia.push({ texto: finalMsg, delay: 3000 });

    return res.status(200).json({ etapa: novaEtapa, respostasExtras: novaRespostasExtras, sequencia });
  }

  if (etapa === 6 && respostasExtras < 3) {
    novaRespostasExtras = respostasExtras + 1;
    const extra = await respostaIA(message);
    return res.status(200).json({
      etapa, respostasExtras: novaRespostasExtras,
      sequencia: [{ texto: extra, delay: 2000 }]
    });
  }

  if (etapa === 6 && respostasExtras >= 3) {
    novaEtapa = 4;
    return res.status(200).json({
      etapa: novaEtapa, respostasExtras: 0, sequencia: [
        { texto: "🌑 A consulta foi concluída. Para mais respostas, reinicie sua jornada espiritual.", delay: 2000 }
      ]
    });
  }

  const fallback = await respostaIA(message);
  return res.status(200).json({ etapa, respostasExtras, sequencia: [{ texto: fallback, delay: 1500 }] });
}
