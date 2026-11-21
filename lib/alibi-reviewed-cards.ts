import type { OutsiderCard } from './game-content';

// Historical entries remain addressable by existing room state; exclude them only from future deals.
export const retiredAlibiCardIndices = Array.from({ length: 46 }, (_, index) => index);

const shared = {
  outsider: "You were not there. Listen to the others and invent a convincing memory.",
  instruction: "Ask about what happened without retelling the incident. Share a memory or a reaction, not the entire explanation.",
  note: "Ask what changed, who reacted, or what you would have done. Forgetting a detail does not prove guilt.",
};

// Original incidents, editorially reviewed one by one. No familiarity with the inspirations is needed.
export const reviewedAlibiCards: OutsiderCard[] = [
  { ...shared, title: "The Speech That Stopped the Heist", regular: "At the bank’s anniversary party, the music stopped for a toast and we heard drilling beneath the floor. A thief had paid the band to cover the noise. The manager thought it was percussion and applauded." },
  { ...shared, title: "The Funeral Rehearsal", regular: "Grandad faked his death to hear what the family really thought of him. We argued over his car beside the coffin. He gave himself away by asking for wine when we toasted with water." },
  { ...shared, title: "The Invisible Masterpiece", regular: "At an exhibition, we praised an empty frame because the artist claimed only sensitive people could see the painting. The cleaner arrived carrying the real canvas: she had taken it down to fix the hook." },
  { ...shared, title: "A Very Familiar Ghost", regular: "At our holiday cottage, a ghost rattled chains to frighten us away. We caught the sheet on a door handle. Underneath was the landlord, who had rented the same cottage to another family arriving that night." },
  { ...shared, title: "The Case of the Missing Contract", regular: "At dinner, a businessman ordered everyone’s pockets searched for a stolen contract. We had spent the meal resting our glasses on it: the waiter had folded it into a table mat. The wine had erased the signature." },
  { ...shared, title: "The Expert’s Favourite", regular: "At a blind wine tasting, we chose the winning wine. The waiter admitted filling its bottle with leftovers from other glasses to avoid waste. The organiser hid our tasting notes before anyone photographed them." },
  { ...shared, title: "The Anniversary Ambush", regular: "We secretly borrowed a friend’s car to fill it with balloons for his birthday. He reported it stolen before we returned. The police stopped us, and the balloons escaped when an officer opened the boot." },
  { ...shared, title: "The Forgotten Microphone", regular: "At the wedding, the groom rehearsed crying in the bathroom while the best man told him when to sob. His microphone was still on. The bride waited outside the door with her arms folded." },
  { ...shared, title: "The Most Expensive Souvenir", regular: "After a hotel gala, we opened our suitcase and found cash instead of clothes. We returned to reception, terrified. A magician was waiting there in our dressing gown: we had taken his case of stage money." },
];

export const reviewedAlibiTranslations: Record<string, string> = {
  [shared.outsider]: "Não estiveste lá. Ouve os outros e inventa uma memória convincente.",
  [shared.instruction]: "Façam perguntas sobre o que aconteceu sem recontar o episódio. Partilhem uma memória ou uma reação, não a explicação toda.",
  [shared.note]: "Pergunta o que mudou, quem reagiu ou o que terias feito. Esquecer um pormenor não prova culpa.",
  "The Speech That Stopped the Heist": "O brinde que estragou o assalto",
  "At the bank’s anniversary party, the music stopped for a toast and we heard drilling beneath the floor. A thief had paid the band to cover the noise. The manager thought it was percussion and applauded.": "Na festa do banco, a música parou para um brinde e ouvimos uma broca debaixo do chão. Um ladrão tinha pago à banda para abafar o barulho. O gerente pensou que era percussão e aplaudiu.",
  "The Funeral Rehearsal": "O morto queria vinho",
  "Grandad faked his death to hear what the family really thought of him. We argued over his car beside the coffin. He gave himself away by asking for wine when we toasted with water.": "O avô fingiu a própria morte para ouvir o que a família dizia dele. Discutimos a herança do carro junto ao caixão. Quando brindámos com água, ele denunciou-se ao pedir vinho.",
  "The Invisible Masterpiece": "A obra que ninguém viu",
  "At an exhibition, we praised an empty frame because the artist claimed only sensitive people could see the painting. The cleaner arrived carrying the real canvas: she had taken it down to fix the hook.": "Numa exposição, elogiámos uma moldura vazia porque o artista dizia que só os sensíveis viam a pintura. A empregada de limpeza apareceu com a tela verdadeira: tinha-a tirado para arranjar o gancho.",
  "A Very Familiar Ghost": "O senhorio do além",
  "At our holiday cottage, a ghost rattled chains to frighten us away. We caught the sheet on a door handle. Underneath was the landlord, who had rented the same cottage to another family arriving that night.": "Na casa de férias, um fantasma arrastava correntes para nos expulsar. Prendemos o lençol na maçaneta. Por baixo estava o senhorio, que tinha alugado a mesma casa a outra família para essa noite.",
  "The Case of the Missing Contract": "O segredo debaixo do copo",
  "At dinner, a businessman ordered everyone’s pockets searched for a stolen contract. We had spent the meal resting our glasses on it: the waiter had folded it into a table mat. The wine had erased the signature.": "Num jantar, um empresário mandou revistar os bolsos de todos à procura de um contrato roubado. Estava debaixo dos nossos copos: o empregado dobrara-o como base. O vinho já tinha apagado a assinatura.",
  "The Expert’s Favourite": "A colheita do lava-loiça",
  "At a blind wine tasting, we chose the winning wine. The waiter admitted filling its bottle with leftovers from other glasses to avoid waste. The organiser hid our tasting notes before anyone photographed them.": "Numa prova cega, escolhemos o vinho vencedor. O empregado confessou que enchera a garrafa com os restos dos copos para não os desperdiçar. O organizador escondeu as nossas notas de prova antes que alguém as fotografasse.",
  "The Anniversary Ambush": "A surpresa que foi à esquadra",
  "We secretly borrowed a friend’s car to fill it with balloons for his birthday. He reported it stolen before we returned. The police stopped us, and the balloons escaped when an officer opened the boot.": "Levámos o carro de um amigo às escondidas para o encher de balões no aniversário. Ele denunciou o roubo antes de voltarmos. A polícia mandou-nos parar e, ao abrir a bagageira, soltou os balões.",
  "The Forgotten Microphone": "O discurso antes do discurso",
  "At the wedding, the groom rehearsed crying in the bathroom while the best man told him when to sob. His microphone was still on. The bride waited outside the door with her arms folded.": "No casamento, o noivo ensaiava lágrimas na casa de banho enquanto o padrinho lhe dizia quando soluçar. O microfone ficou ligado. A noiva esperava-os à porta, de braços cruzados.",
  "The Most Expensive Souvenir": "A mala cheia de segredos",
  "After a hotel gala, we opened our suitcase and found cash instead of clothes. We returned to reception, terrified. A magician was waiting there in our dressing gown: we had taken his case of stage money.": "Depois de uma gala no hotel, abrimos a mala e encontrámos notas em vez de roupa. Voltámos à receção, em pânico. Esperava-nos um mágico com o nosso roupão: tínhamos levado a mala do dinheiro falso.",
};
