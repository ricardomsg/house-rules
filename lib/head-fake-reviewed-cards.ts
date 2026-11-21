import type { OutsiderCard } from './game-content';

// Editorial pass, 2026-10-05: keep historical indices; draw only approved cards.
// These are situations to interpret, not a prescribed sequence of gestures.
export const retiredHeadFakeCardIndices = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31, 33, 34, 35, 37, 38, 39, 40, 41, 43, 44, 45, 47, 48,
];

export const headFakeTitleOverrides: Record<number, string> = {
  9: 'Do not get away',
  12: 'Crossed strings',
  18: 'Who is in charge?',
  32: 'Just one more cut',
  36: 'It was better before',
  42: 'A delicate balance',
  46: 'It is the thought that counts',
};

type ReviewedPair = {
  title: [string, string];
  regular: [string, string];
  outsider: [string, string];
};

const pairs: ReviewedPair[] = [
  {
    title: ['Before they come back', 'Antes que voltem'],
    regular: [
      'You are a spy searching a hotel room for a hidden microphone. Find it and test it without leaving signs of your search; someone is coming back.',
      'És um espião à procura de um microfone escondido num quarto de hotel. Encontra-o e testa-o sem deixar sinais da busca: alguém está a voltar.',
    ],
    outsider: [
      'You have lost an engagement ring in a hotel room. Find it and rehearse your surprise proposal before your partner comes back.',
      'Perdeste um anel de noivado num quarto de hotel. Encontra-o e ensaia o pedido de casamento surpresa antes de o teu par voltar.',
    ],
  },
  {
    title: ['Please keep still', 'Nem se mexa'],
    regular: [
      'You are a dentist treating a very nervous giant. Examine the painful tooth and try to fix it while your enormous patient keeps moving.',
      'És um dentista a tratar um gigante muito nervoso. Examina o dente que lhe dói e tenta tratá-lo enquanto o teu enorme paciente não para quieto.',
    ],
    outsider: [
      'You are a jeweller fitting a crown on a very impatient king. Find what is pinching and adjust it while His Majesty keeps moving.',
      'És um joalheiro a ajustar uma coroa num rei muito impaciente. Descobre o que o está a magoar e resolve o problema enquanto Sua Majestade não para quieta.',
    ],
  },
  {
    title: ['Does this pass?', 'Está aprovado?'],
    regular: [
      'You taste the king’s banquet to check for poison. A dish seems suspicious: quietly check the diners for symptoms and preserve a sample without alarming the guests.',
      'Provas o banquete do rei para detetar veneno. Um prato parece suspeito: observa discretamente os convidados à procura de sintomas e guarda uma amostra sem os alarmar.',
    ],
    outsider: [
      'You are a restaurant critic reviewing a tasting menu in secret. Examine the presentation, taste and take discreet notes. A dreadful dish needs sending back without revealing who you are.',
      'És um crítico gastronómico a avaliar em segredo um menu de degustação. Examina a apresentação, prova e tira notas discretas. Um prato horrível tem de voltar à cozinha sem revelar quem és.',
    ],
  },
  {
    title: ['Open with care', 'Abrir com cuidado'],
    regular: [
      'You are a treasure hunter opening a chest in an ancient tomb. Check for traps, examine what is inside and decide how to take the treasure safely.',
      'És um caçador de tesouros a abrir um baú num túmulo antigo. Procura armadilhas, examina o que está lá dentro e decide como levar o tesouro em segurança.',
    ],
    outsider: [
      'You are airport security opening a suspicious suitcase. Check for danger, examine what is inside and decide which objects cannot go on the plane.',
      'Trabalhas na segurança de um aeroporto e vais abrir uma mala suspeita. Procura perigos, examina o conteúdo e decide o que não pode entrar no avião.',
    ],
  },
  {
    title: ['Something is in here', 'Há qualquer coisa aqui'],
    regular: [
      'You investigate a haunted bedroom. Follow an unexplained noise, test where it comes from and attempt to trap whatever is causing it.',
      'Investigas um quarto assombrado. Segue um ruído inexplicável, testa de onde vem e tenta apanhar o que quer que o esteja a causar.',
    ],
    outsider: [
      'You are a plumber investigating a noise inside a bedroom wall. Find the faulty pipe and contain the water when your repair makes it burst.',
      'És um canalizador a investigar um ruído dentro da parede de um quarto. Encontra o cano avariado e contém a água quando a tua reparação o rebenta.',
    ],
  },
  {
    title: ['Everything is under control', 'Tudo sob controlo'],
    regular: [
      'You are a magician whose box keeps producing the wrong things. Try another trick and convince the imaginary audience that every failure was deliberate.',
      'És um mágico cuja caixa só faz aparecer coisas erradas. Tenta outro truque e convence o público imaginário de que cada falhanço foi de propósito.',
    ],
    outsider: [
      'You sell gadgets on television, but every item in your demonstration box is faulty. Try another product and convince the imaginary audience it is a bargain.',
      'Vendes engenhocas na televisão, mas tudo o que tiras da caixa de demonstração está avariado. Tenta outro produto e convence o público imaginário de que é uma pechincha.',
    ],
  },
  {
    title: ['One ingredient short', 'Só falta um ingrediente'],
    regular: [
      'You are a wizard secretly brewing a love potion. Test it on yourself, discover an unexpected effect and try to correct the mixture before your date arrives.',
      'És um feiticeiro a preparar uma poção do amor em segredo. Testa-a em ti, descobre um efeito inesperado e tenta corrigir a mistura antes de chegar o teu par.',
    ],
    outsider: [
      'You are cooking a romantic dinner and hiding how little you know. Taste the sauce, discover a terrible mistake and try to rescue it before your date arrives.',
      'Preparas um jantar romântico sem querer admitir que não sabes cozinhar. Prova o molho, descobre um erro terrível e tenta salvá-lo antes de chegar o teu par.',
    ],
  },
  {
    title: ['I am watching', 'Eu estou a ver'],
    regular: [
      'You supervise an exam and suspect someone is cheating. Hand out papers, watch your imaginary students and try to catch the culprit in the act.',
      'Vigias um exame e suspeitas de que alguém está a copiar. Distribui as folhas, observa os alunos imaginários e tenta apanhar o culpado em flagrante.',
    ],
    outsider: [
      'You deal cards in a casino and suspect someone is cheating. Run the game, watch your imaginary customers and try to catch the culprit in the act.',
      'Dás cartas num casino e suspeitas de que alguém está a fazer batota. Conduz o jogo, observa os clientes imaginários e tenta apanhar o culpado em flagrante.',
    ],
  },
  {
    title: ['Out of sight', 'Fora de vista'],
    regular: [
      'You are an astronomer who spots a UFO through a telescope. Adjust your equipment, record the evidence and find it again whenever it vanishes.',
      'És um astrónomo que vê um OVNI pelo telescópio. Ajusta o equipamento, regista as provas e volta a encontrá-lo sempre que desaparece.',
    ],
    outsider: [
      'You are a photographer who spots a celebrity on a secret date. Adjust your equipment, record the evidence and find them again whenever they hide.',
      'És um fotógrafo que vê uma celebridade num encontro secreto. Ajusta o equipamento, regista as provas e volta a encontrá-la sempre que se esconde.',
    ],
  },
  {
    title: ['Steady hands', 'Mãos firmes'],
    regular: [
      'You are defusing a bomb with tangled wires. Study the connections, choose your tools and undo the tangle as the countdown gets uncomfortably close.',
      'Estás a desarmar uma bomba com fios emaranhados. Estuda as ligações, escolhe as ferramentas e desfaz o emaranhado enquanto a contagem chega perigosamente ao fim.',
    ],
    outsider: [
      'You are repairing a bride’s tangled necklace. Study the clasp, choose your tools and undo the tangle as the furious bride signals that the ceremony is starting.',
      'Estás a reparar o colar emaranhado de uma noiva. Examina o fecho, escolhe as ferramentas e desfaz o emaranhado enquanto a noiva furiosa avisa que a cerimónia vai começar.',
    ],
  },
];

const instruction = 'Act out your situation silently until the timer ends. Invent what happens next; do not copy a fixed sequence. Watch the others while staying in character. Everything is imaginary; stay by your seat and do not touch anyone.';
export const reviewedHeadFakeCards: OutsiderCard[] = pairs.map(({ title, regular, outsider }) => ({
  title: title[0], regular: regular[0], outsider: outsider[0], instruction,
}));

export const reviewedHeadFakeTranslations: Record<string, string> = {
  'Do not get away': 'Não me escapes',
  'Crossed strings': 'Fios cruzados',
  'Who is in charge?': 'Quem manda aqui?',
  'Just one more cut': 'Só mais um corte',
  'It was better before': 'Isto estava melhor antes',
  'A delicate balance': 'Por um fio',
  'It is the thought that counts': 'É o gesto que conta',
  [instruction]: 'Representem a vossa situação em silêncio até o tempo acabar. Inventem o que acontece a seguir, sem seguir uma sequência fixa. Observem os outros sem sair da personagem. Tudo é imaginário: fiquem junto ao vosso lugar e não toquem em ninguém.',
  ...Object.fromEntries(pairs.flatMap(({ title, regular, outsider }) => [title, regular, outsider])),
};
