import type { OutsiderCard } from './game-content';

// Editorial replacement pool. Historical source positions remain unchanged.
// Every card in this pool was reviewed individually.
const rows: [string, string, string, string, string, string][] = [
  ["The Night Bus",
    "O autocarro da noite",
    "Reuse one meaningful word from the previous answer (not just “the”, “and” or a pronoun). Give it a different use or context. The first speaker answers freely. Example: after “I would bring a bag of snacks”, “I would charge a bag of coins for every complaint.”",
    "Reutiliza uma palavra com significado da resposta anterior (não vale só «o», «e» ou um pronome). Usa-a noutro sentido ou contexto. A primeira pessoa responde livremente. Exemplo: depois de «Levava um saco com o jantar», «Cobrava um saco de moedas por cada reclamação».",
    "How would you make an eight-hour coach journey bearable?",
    "Como tornavas suportável uma viagem de autocarro de oito horas?"],
  ["The Spare Key",
    "A chave suplente",
    "Include an object whose name begins with the same letter as your first name as shown in the room. Put it anywhere in a natural answer; do not mention the letter. Example: Ines might say “An iron, in case the rescue team has a dress code.”",
    "Inclui um objeto cujo nome comece pela mesma letra do teu primeiro nome apresentado na sala. Mete-o onde quiseres numa resposta natural; não digas a letra. Exemplo: a Inês pode dizer «Um isqueiro, caso isto acabe num jantar à luz das velas».",
    "What would you bring if you knew you would spend the night stuck in a lift?",
    "O que levavas se soubesses que ias passar a noite preso num elevador?"],
  ["Room with a View",
    "Quarto com vista",
    "Recommend something, then reveal a specific downside that undermines your recommendation. Vary how you connect the two parts. Example: “The room is wonderfully quiet. The last guest is still there, though.”",
    "Recomenda alguma coisa e depois revela um defeito concreto que estrague a tua recomendação. Varia a maneira de ligar as duas partes. Exemplo: «O quarto é sossegadíssimo. O último hóspede é que ainda lá está».",
    "You are organising a cheap romantic weekend. What do you recommend?",
    "Estás a organizar um fim de semana romântico barato. O que recomendas?"],
  ["The Reunion", "O reencontro",
    "Mention a real object you can currently see in the shared room, weaving it naturally into your answer. It must be visible to the others too. Do not point at it or say it is in the room. Example: if a lamp is visible, ‘A lamp: I intend to interrogate whoever organised this.’",
    "Menciona um objeto real que estejas a ver na sala e integra-o naturalmente na resposta. Os outros também têm de o conseguir ver. Não apontes nem digas que está na sala. Exemplo: se houver um candeeiro à vista, «Um candeeiro: pretendo interrogar quem organizou isto».",
    "What would you take to a weekend reunion with your old classmates?", "O que levavas para um fim de semana de reencontro com a tua antiga turma?"],
  ["The Long Weekend",
    "O fim de semana comprido",
    "Solve the problem by using an ordinary object for a job it was not made for. Say what you would do with it; naming a strange object is not enough. Example: “I would hang a saucepan at the door so nobody has an excuse not to knock.”",
    "Resolve o problema usando um objeto vulgar para uma função para a qual não foi feito. Diz o que fazias com ele; não basta escolher um objeto estranho. Exemplo: «Pendurava uma panela à porta, para ninguém ter desculpa para não bater antes de entrar».",
    "Eight friends are sharing a tiny holiday flat. What is your survival plan?",
    "Oito amigos vão partilhar um apartamento minúsculo nas férias. Qual é o teu plano de sobrevivência?"],
  ["The New Neighbour", "O novo vizinho",
    "Include an object normally made mostly of glass. Do not mention the material or talk about breaking it. Example: ‘A mirror, so he can finally see who keeps parking across two spaces.’",
    "Inclui um objeto normalmente feito sobretudo de vidro. Não digas o material nem fales em parti-lo. Exemplo: «Um espelho, para ele ver quem é que estaciona sempre a ocupar dois lugares».",
    "What welcome gift would you give a neighbour who already annoys you?", "Que presente de boas-vindas davas a um vizinho que já te irrita?"],
  ["The Winning Ticket", "O boletim premiado",
    "Describe something you would do without buying, renting or hiring anything. You can use what you already own. Never mention money, prices or the fact that it costs nothing. Example: ‘I would delete my boss’s number before he calls about tomorrow.’",
    "Descreve uma coisa que fazias sem comprar, alugar ou contratar nada. Podes usar o que já tens. Nunca fales em dinheiro, preços ou no facto de não custar nada. Exemplo: «Apagava o número do meu chefe antes que ele ligasse por causa de amanhã».",
    "You have just won the lottery. How would you celebrate your first day?", "Acabaste de ganhar o Euromilhões. Como festejavas o primeiro dia?"],
];

const instruction = "Answer the starter question in seating order. Then ask follow-up questions. Keep answers short, invent freely and follow your private rule without explaining it. Do not copy the private example.";
const outsider = "You do not know the hidden rule. Listen to how people answer, improvise a plausible answer and adapt as you notice patterns. You do not need to say what the rule is.";

export const reviewedHouseRuleCards: OutsiderCard[] = rows.map(([title, , regular, , question]) => ({
  title, regular, outsider, instruction, note: `Starter question: ${question}`,
}));

export const reviewedHouseRuleTranslations: Record<string, string> = {
  [instruction]: "Respondam à pergunta inicial pela ordem dos lugares. Depois façam perguntas uns aos outros. Deem respostas curtas, inventem à vontade e sigam a regra privada sem a explicar. Não copiem o exemplo privado.",
  [outsider]: "Não sabes a regra secreta. Ouve como os outros respondem, improvisa uma resposta plausível e adapta-te aos padrões que fores descobrindo. Não precisas de dizer qual é a regra.",
  ...Object.fromEntries(rows.flatMap(([title, titlePt, regular, regularPt, question, questionPt]) => [
    [title, titlePt], [regular, regularPt], [`Starter question: ${question}`, `Pergunta inicial: ${questionPt}`],
  ])),
};

// Retired from future deals, not removed: saved games and room history use these positions.
export const retiredHouseRuleCardIndices = Array.from({ length: 49 }, (_, index) => index);
