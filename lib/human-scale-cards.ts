// Original prompts built for spoken, subjective examples rather than trivia.
// Design reference (reviewed 2026-10-05): https://www.wavelength.zone/
// Its official explanation motivates subjective clues between two extremes;
// these scenarios, endpoint wording and individual pairwise scoring are our own.
const rows: [string, string, string, string, string, string][] = [
  ['Almost romantic', 'Immediate restraining order', 'A fictional grand romantic gesture', 'Quase romântico', 'Ordem de restrição imediata', 'Um grande gesto romântico imaginário'],
  ['A tiny white lie', 'A whole second identity', 'An excuse for skipping a family lunch', 'Uma mentirinha', 'Uma identidade falsa completa', 'Uma desculpa para faltar ao almoço de família'],
  ['A harmless office perk', 'The company is definitely a cult', 'A new employee benefit', 'Um benefício inofensivo', 'A empresa é claramente uma seita', 'Uma nova vantagem oferecida pela empresa'],
  ['A gentle haunting', 'The exorcist resigns', 'Something a ghost does in your flat', 'Uma assombração discreta', 'O exorcista despede-se', 'Algo que um fantasma faz no teu apartamento'],
  ['A little embarrassing', 'Change your name and emigrate', 'An accidental message in the work chat', 'Um bocadinho constrangedor', 'Mudar de nome e emigrar', 'Uma mensagem enviada por engano para o grupo do trabalho'],
  ['A thoughtful gift', 'Evidence in a future trial', 'A present for a fictional ex', 'Um presente atencioso', 'Prova num futuro julgamento', 'Um presente para um ex imaginário'],
  ['Slightly overprepared', 'Ready for civilisation to collapse', 'Something to bring to a picnic', 'Um pouco prevenido de mais', 'Pronto para o fim da civilização', 'Algo para levar para um piquenique'],
  ['Ordinary neighbour', 'Final boss of the condominium', 'A request at a residents meeting', 'Vizinho normal', 'Boss final do condomínio', 'Um pedido numa reunião de condomínio'],
  ['A cheap thrill', 'The insurance refuses to cover it', 'An attraction at a terrible theme park', 'Uma emoção barata', 'O seguro recusa cobrir aquilo', 'Uma atração num parque de diversões péssimo'],
  ['A charming surprise', 'The wedding is cancelled', 'Something hidden inside a wedding cake', 'Uma surpresa querida', 'O casamento é cancelado', 'Algo escondido dentro de um bolo de casamento'],
  ['Very easy to explain', 'Needs a lawyer and a diagram', 'An object found in your fictional suitcase', 'Muito fácil de explicar', 'Precisa de advogado e esquema', 'Um objeto encontrado na tua mala imaginária'],
  ['A minor inconvenience', 'The villain wins by default', 'A superhero weakness', 'Um pequeno incómodo', 'O vilão ganha por falta de comparência', 'Uma fraqueza de um super-herói'],
  ['A reasonable house rule', 'A dictatorship in slippers', 'A rule for sharing a flat', 'Uma regra razoável', 'Uma ditadura de pantufas', 'Uma regra para partilhar casa'],
  ['Surprisingly useful', 'Makes everything worse', 'A spell sold by a discount wizard', 'Surpreendentemente útil', 'Só piora tudo', 'Um feitiço vendido por um feiticeiro dos trezentos'],
  ['A discreet hint', 'Even the furniture understands', 'A way to tell guests the party is over', 'Uma pista discreta', 'Até os móveis percebem', 'Uma forma de dizer aos convidados que a festa acabou'],
  ['A quiet retirement', 'The pension fund panics', 'A hobby for a retired supervillain', 'Uma reforma tranquila', 'O fundo de pensões entra em pânico', 'Um passatempo para um supervilão reformado'],
  ['A harmless typo', 'The entire village comes to watch', 'A mistake on a restaurant sign', 'Uma gralha inofensiva', 'A aldeia inteira vem ver', 'Um erro no letreiro de um restaurante'],
  ['Nearly believable', 'Even a toddler spots the lie', 'An explanation for a dragon in the garage', 'Quase credível', 'Até uma criança topa a mentira', 'Uma explicação para haver um dragão na garagem'],
  ['A modest upgrade', 'The king needs a loan', 'A luxury feature in a bathroom', 'Uma pequena melhoria', 'O rei precisa de um empréstimo', 'Um luxo numa casa de banho'],
  ['A little clingy', 'Has already named your grandchildren', 'A message after a fictional first date', 'Um bocadinho pegajoso', 'Já escolheu os nomes dos netos', 'Uma mensagem depois de um primeiro encontro imaginário'],
  ['Useful assistant', 'Reason to unplug the house', 'A feature in a smart home', 'Assistente útil', 'Motivo para desligar a casa da tomada', 'Uma função de uma casa inteligente'],
  ['A polite complaint', 'The manager leaves the country', 'A complaint at a haunted hotel', 'Uma reclamação educada', 'O gerente foge do país', 'Uma reclamação num hotel assombrado'],
  ['A small distraction', 'Nobody remembers why they came', 'An interruption during a boring meeting', 'Uma pequena distração', 'Já ninguém sabe ao que vinha', 'Uma interrupção numa reunião aborrecida'],
  ['A plausible excuse', 'A new religion starts', 'Why a statue suddenly starts talking', 'Uma desculpa plausível', 'Nasce uma nova religião', 'Porque é que uma estátua começou a falar'],
  ['An ordinary souvenir', 'Customs calls three departments', 'Something brought back from holiday', 'Uma recordação normal', 'A alfândega chama três departamentos', 'Algo trazido de umas férias'],
  ['Mildly unprofessional', 'A documentary gets commissioned', 'A mistake by a fictional wedding photographer', 'Pouco profissional', 'Encomendam um documentário', 'Um erro de um fotógrafo de casamentos imaginário'],
  ['A useful emergency contact', 'The last person you should call', 'Someone to call when aliens arrive', 'Um contacto de emergência útil', 'A última pessoa a quem ligar', 'Alguém a quem ligar quando chegam extraterrestres'],
  ['An ordinary queue', 'You age three years waiting', 'A place where you need to take a number', 'Uma fila normal', 'Envelheces três anos à espera', 'Um sítio onde é preciso tirar uma senha'],
  ['A harmless flirtation', 'The furniture needs therapy', 'A fictional pickup line for a haunted house', 'Um flirt inofensivo', 'Os móveis precisam de terapia', 'Uma frase de engate imaginária numa casa assombrada'],
  ['A forgettable scandal', 'A statue gets removed', 'A scandal involving a fictional mayor', 'Um escândalo esquecível', 'Retiram uma estátua', 'Um escândalo de um presidente de câmara imaginário'],
];

export const humanScaleCards = rows.map(([left, right, topic]) => ({ left, right, topic }));
export const humanScalePtPT: Record<string, string> = Object.fromEntries(rows.flatMap(([left, right, topic, leftPt, rightPt, topicPt]) => [[left, leftPt], [right, rightPt], [topic, topicPt]]));
