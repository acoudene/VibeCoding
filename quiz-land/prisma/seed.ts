/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedQuestion = {
  text: string;
  choices: string[];
  correctIndex: number;
  difficulty?: number;
  explanation?: string;
};

type SeedCategory = {
  slug: string;
  name: string;
  emoji: string;
  questions: SeedQuestion[];
};

const CATEGORIES: SeedCategory[] = [
  {
    slug: "films-series",
    name: "Films & Séries",
    emoji: "🎬",
    questions: [
      {
        text: "Quel film a remporté l'Oscar du meilleur film en 2020 ?",
        choices: ["1917", "Parasite", "Joker", "Le Mans 66"],
        correctIndex: 1,
        explanation: "Parasite de Bong Joon-ho, premier film non anglophone à gagner.",
      },
      {
        text: "Qui réalise la trilogie originale du Seigneur des Anneaux ?",
        choices: ["Peter Jackson", "James Cameron", "Steven Spielberg", "Ridley Scott"],
        correctIndex: 0,
      },
      {
        text: "Dans Game of Thrones, quelle maison a pour devise « Winter is Coming » ?",
        choices: ["Lannister", "Targaryen", "Stark", "Baratheon"],
        correctIndex: 2,
      },
      {
        text: "Quel acteur incarne Iron Man dans le MCU ?",
        choices: ["Chris Evans", "Robert Downey Jr.", "Mark Ruffalo", "Chris Hemsworth"],
        correctIndex: 1,
      },
      {
        text: "Quelle série suit la famille Roy et son empire médiatique ?",
        choices: ["Succession", "Billions", "The Crown", "Ozark"],
        correctIndex: 0,
        difficulty: 2,
      },
      {
        text: "Dans Pulp Fiction, quel objet brille dans la mallette ?",
        choices: ["Des diamants", "On ne le voit jamais", "De l'or", "Une bombe"],
        correctIndex: 1,
        difficulty: 2,
      },
      {
        text: "Quel film d'animation Pixar parle d'un rat cuisinier à Paris ?",
        choices: ["Là-haut", "Ratatouille", "Wall-E", "Les Indestructibles"],
        correctIndex: 1,
      },
      {
        text: "Combien de films composent la saga Skywalker (Star Wars) ?",
        choices: ["6", "7", "9", "12"],
        correctIndex: 2,
        difficulty: 2,
      },
    ],
  },
  {
    slug: "culture-geek",
    name: "Culture Geek",
    emoji: "🕹️",
    questions: [
      {
        text: "Dans quel langage le moteur du web React est-il principalement écrit ?",
        choices: ["Python", "JavaScript", "Rust", "Go"],
        correctIndex: 1,
      },
      {
        text: "Quel personnage est la mascotte de Nintendo ?",
        choices: ["Sonic", "Mario", "Pikachu", "Kirby"],
        correctIndex: 1,
      },
      {
        text: "Que signifie l'acronyme « HTTP » ?",
        choices: [
          "HyperText Transfer Protocol",
          "High Transfer Text Protocol",
          "HyperText Transmission Process",
          "Home Tool Transfer Protocol",
        ],
        correctIndex: 0,
      },
      {
        text: "Dans l'univers de Star Wars, quelle est la couleur du sabre de Yoda ?",
        choices: ["Bleu", "Rouge", "Vert", "Violet"],
        correctIndex: 2,
      },
      {
        text: "Quel jeu vidéo de 2011 a popularisé le « bloc » et la survie en cubes ?",
        choices: ["Terraria", "Minecraft", "Roblox", "Fortnite"],
        correctIndex: 1,
      },
      {
        text: "Quelle entreprise développe le système d'exploitation Android ?",
        choices: ["Apple", "Microsoft", "Google", "Samsung"],
        correctIndex: 2,
      },
      {
        text: "Combien font 1010 en binaire, converti en décimal ?",
        choices: ["8", "10", "12", "20"],
        correctIndex: 1,
        difficulty: 2,
      },
      {
        text: "Quel super-héros Marvel est aussi appelé « le Vengeur écarlate » par son armure ?",
        choices: ["Spider-Man", "Captain America", "Iron Man", "Thor"],
        correctIndex: 2,
        difficulty: 2,
      },
    ],
  },
  {
    slug: "sport",
    name: "Sport",
    emoji: "⚽",
    questions: [
      {
        text: "Combien de joueurs composent une équipe de football sur le terrain ?",
        choices: ["9", "10", "11", "12"],
        correctIndex: 2,
      },
      {
        text: "Quel pays a remporté la Coupe du Monde de football 2018 ?",
        choices: ["Brésil", "Allemagne", "France", "Croatie"],
        correctIndex: 2,
      },
      {
        text: "Dans quel sport pratique-t-on un « smash » et un « ace » ?",
        choices: ["Tennis", "Basket", "Rugby", "Hockey"],
        correctIndex: 0,
      },
      {
        text: "Tous les combien d'années ont lieu les Jeux Olympiques d'été ?",
        choices: ["2 ans", "3 ans", "4 ans", "5 ans"],
        correctIndex: 2,
      },
      {
        text: "Quel joueur détient le record de Ballons d'Or (au 2024) ?",
        choices: ["Cristiano Ronaldo", "Lionel Messi", "Michel Platini", "Zinédine Zidane"],
        correctIndex: 1,
        difficulty: 2,
      },
      {
        text: "Combien de points vaut un panier à trois points au basket ?",
        choices: ["2", "3", "4", "1"],
        correctIndex: 1,
      },
      {
        text: "Quelle course cycliste française dure environ trois semaines en juillet ?",
        choices: ["Paris-Roubaix", "Le Tour de France", "La Vuelta", "Le Giro"],
        correctIndex: 1,
      },
      {
        text: "Dans le rugby à XV, combien de points rapporte un essai (au 2024) ?",
        choices: ["3", "4", "5", "7"],
        correctIndex: 2,
        difficulty: 2,
      },
    ],
  },
  {
    slug: "histoire",
    name: "Histoire",
    emoji: "🏛️",
    questions: [
      {
        text: "En quelle année a eu lieu la prise de la Bastille ?",
        choices: ["1789", "1799", "1804", "1715"],
        correctIndex: 0,
      },
      {
        text: "Qui était le premier empereur des Français ?",
        choices: ["Louis XIV", "Napoléon Bonaparte", "Charlemagne", "Louis XVI"],
        correctIndex: 1,
      },
      {
        text: "Quel mur est tombé en 1989 ?",
        choices: ["Le mur de Berlin", "La Grande Muraille", "Le mur d'Hadrien", "Le mur des Lamentations"],
        correctIndex: 0,
      },
      {
        text: "Quelle civilisation a construit les pyramides de Gizeh ?",
        choices: ["Les Romains", "Les Grecs", "Les Égyptiens", "Les Mayas"],
        correctIndex: 2,
      },
      {
        text: "En quelle année a commencé la Première Guerre mondiale ?",
        choices: ["1912", "1914", "1918", "1939"],
        correctIndex: 1,
      },
      {
        text: "Qui a découvert l'Amérique en 1492 (selon l'histoire classique) ?",
        choices: ["Magellan", "Vasco de Gama", "Christophe Colomb", "Marco Polo"],
        correctIndex: 2,
      },
      {
        text: "Quel traité met fin à la Première Guerre mondiale en 1919 ?",
        choices: ["Traité de Versailles", "Traité de Rome", "Traité de Vienne", "Traité de Tordesillas"],
        correctIndex: 0,
        difficulty: 2,
      },
      {
        text: "Quelle reine d'Égypte a régné aux côtés de Jules César puis Marc Antoine ?",
        choices: ["Néfertiti", "Cléopâtre", "Hatchepsout", "Théodora"],
        correctIndex: 1,
        difficulty: 2,
      },
    ],
  },
  {
    slug: "sciences",
    name: "Sciences & Nature",
    emoji: "🔬",
    questions: [
      {
        text: "Quel est le symbole chimique de l'or ?",
        choices: ["Ag", "Au", "Or", "Go"],
        correctIndex: 1,
      },
      {
        text: "Quelle planète est la plus proche du Soleil ?",
        choices: ["Vénus", "Mars", "Mercure", "Terre"],
        correctIndex: 2,
      },
      {
        text: "Combien d'os compte le corps humain adulte ?",
        choices: ["206", "212", "180", "300"],
        correctIndex: 0,
        difficulty: 2,
      },
      {
        text: "Quel gaz les plantes absorbent-elles pour la photosynthèse ?",
        choices: ["Oxygène", "Azote", "Dioxyde de carbone", "Hydrogène"],
        correctIndex: 2,
      },
      {
        text: "Quelle est la vitesse approximative de la lumière dans le vide ?",
        choices: ["300 000 km/s", "30 000 km/s", "3 000 000 km/s", "150 000 km/s"],
        correctIndex: 0,
      },
      {
        text: "Qui a formulé la théorie de la relativité ?",
        choices: ["Newton", "Einstein", "Galilée", "Tesla"],
        correctIndex: 1,
      },
    ],
  },
  {
    slug: "geographie",
    name: "Géographie",
    emoji: "🌍",
    questions: [
      {
        text: "Quelle est la capitale de l'Australie ?",
        choices: ["Sydney", "Melbourne", "Canberra", "Perth"],
        correctIndex: 2,
        difficulty: 2,
      },
      {
        text: "Quel est le plus long fleuve du monde ?",
        choices: ["L'Amazone", "Le Nil", "Le Mississippi", "Le Yangtsé"],
        correctIndex: 1,
        explanation: "Le débat existe, mais le Nil est traditionnellement cité comme le plus long.",
      },
      {
        text: "Sur quel continent se trouve le désert du Sahara ?",
        choices: ["Asie", "Afrique", "Amérique", "Océanie"],
        correctIndex: 1,
      },
      {
        text: "Quelle est la capitale du Japon ?",
        choices: ["Osaka", "Kyoto", "Tokyo", "Nagoya"],
        correctIndex: 2,
      },
      {
        text: "Combien y a-t-il de continents sur Terre ?",
        choices: ["5", "6", "7", "8"],
        correctIndex: 2,
      },
      {
        text: "Quel pays a la plus grande superficie au monde ?",
        choices: ["Canada", "Chine", "États-Unis", "Russie"],
        correctIndex: 3,
      },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding Quiz Land...");

  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, emoji: cat.emoji },
      create: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
    });

    // On évite les doublons : on supprime puis recrée les questions de la catégorie.
    await prisma.question.deleteMany({ where: { categoryId: category.id } });

    await prisma.question.createMany({
      data: cat.questions.map((q) => ({
        categoryId: category.id,
        mode: "MULTIPLE_CHOICE" as const,
        text: q.text,
        choices: q.choices,
        correctIndex: q.correctIndex,
        difficulty: q.difficulty ?? 1,
        explanation: q.explanation ?? null,
      })),
    });

    console.log(`  ✅ ${cat.emoji} ${cat.name} — ${cat.questions.length} questions`);
  }

  const total = await prisma.question.count();
  console.log(`✨ Terminé. ${total} questions au total.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
