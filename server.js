const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sampleCards = [
  {
    name: 'Shield Recruit',
    cost: 1,
    attack: 1,
    health: 2,
    description: 'A sturdy early defender.'
  },
  {
    name: 'Coinblade Rogue',
    cost: 2,
    attack: 2,
    health: 1,
    description: 'Cheap pressure for quick banner damage.'
  },
  {
    name: 'Market Guard',
    cost: 3,
    attack: 2,
    health: 4,
    description: 'Reliable board presence.'
  },
  {
    name: 'Banner Knight',
    cost: 4,
    attack: 4,
    health: 3,
    description: 'A strong attacker for closing games.'
  },
  {
    name: 'Siege Adept',
    cost: 5,
    attack: 5,
    health: 5,
    description: 'Expensive, but hits the banner hard.'
  }
];

const sampleBuildings = [
  {
    name: 'Watchtower',
    cost: 2,
    hp: 4,
    effect: 'Placeholder: Future defensive bonus.'
  },
  {
    name: 'Mint',
    cost: 3,
    hp: 3,
    effect: 'Placeholder: Future coin generation.'
  },
  {
    name: 'Barracks',
    cost: 4,
    hp: 5,
    effect: 'Placeholder: Future unit buff.'
  }
];

let nextCardId = 1;
let nextBuildingId = 1;
let game = createGame();

function createGame() {
  nextCardId = 1;
  nextBuildingId = 1;

  return {
    currentPlayer: 0,
    turnNumber: 1,
    winner: null,
    players: [
      createPlayer('Player A'),
      createPlayer('Player B')
    ]
  };
}

function createPlayer(name) {
  const deck = createDeck();

  return {
    name,
    bannerHp: 20,
    coins: 5,
    deck,
    hand: deck.splice(0, 5),
    board: [],
    buildings: [],
    buildingOptions: sampleBuildings.map((building) => ({ ...building }))
  };
}

function createDeck() {
  const deck = [];

  for (let i = 0; i < 3; i += 1) {
    sampleCards.forEach((card) => {
      deck.push({
        ...card,
        id: nextCardId++,
        canAttack: false
      });
    });
  }

  return shuffle(deck);
}

function shuffle(items) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function getActivePlayer() {
  return game.players[game.currentPlayer];
}

function getOpponent() {
  return game.players[game.currentPlayer === 0 ? 1 : 0];
}

function requireActiveGame(res) {
  if (game.winner) {
    res.status(400).json({ error: `${game.winner} already won. Reset to play again.` });
    return false;
  }

  return true;
}

function drawCard(player) {
  if (player.deck.length > 0) {
    player.hand.push(player.deck.shift());
  }
}

app.get('/api/game', (req, res) => {
  res.json(game);
});

app.post('/api/play-card', (req, res) => {
  if (!requireActiveGame(res)) return;

  const { cardId } = req.body;
  const player = getActivePlayer();
  const cardIndex = player.hand.findIndex((card) => card.id === Number(cardId));

  if (cardIndex === -1) {
    return res.status(404).json({ error: 'Card not found in active player hand.' });
  }

  const card = player.hand[cardIndex];

  if (player.coins < card.cost) {
    return res.status(400).json({ error: 'Not enough coins to play that card.' });
  }

  player.coins -= card.cost;
  player.hand.splice(cardIndex, 1);
  player.board.push({
    ...card,
    canAttack: false
  });

  res.json(game);
});

app.post('/api/attack-banner', (req, res) => {
  if (!requireActiveGame(res)) return;

  const { cardId } = req.body;
  const player = getActivePlayer();
  const opponent = getOpponent();
  const card = player.board.find((boardCard) => boardCard.id === Number(cardId));

  if (!card) {
    return res.status(404).json({ error: 'Card not found on active player board.' });
  }

  if (!card.canAttack) {
    return res.status(400).json({ error: 'That card cannot attack right now.' });
  }

  opponent.bannerHp = Math.max(0, opponent.bannerHp - card.attack);
  card.canAttack = false;

  if (opponent.bannerHp === 0) {
    game.winner = player.name;
  }

  res.json(game);
});

app.post('/api/build-building', (req, res) => {
  if (!requireActiveGame(res)) return;

  const { buildingName } = req.body;
  const player = getActivePlayer();
  const building = player.buildingOptions.find((option) => option.name === buildingName);

  if (!building) {
    return res.status(404).json({ error: 'Building option not found.' });
  }

  if (player.buildings.length >= 3) {
    return res.status(400).json({ error: 'All building slots are full.' });
  }

  if (player.coins < building.cost) {
    return res.status(400).json({ error: 'Not enough coins to build that building.' });
  }

  player.coins -= building.cost;
  player.buildings.push({
    ...building,
    id: nextBuildingId++
  });

  res.json(game);
});

app.post('/api/end-turn', (req, res) => {
  if (!requireActiveGame(res)) return;

  game.currentPlayer = game.currentPlayer === 0 ? 1 : 0;

  if (game.currentPlayer === 0) {
    game.turnNumber += 1;
  }

  const player = getActivePlayer();
  player.coins = 5;
  drawCard(player);
  player.board.forEach((card) => {
    card.canAttack = true;
  });

  res.json(game);
});

app.post('/api/reset', (req, res) => {
  game = createGame();
  res.json(game);
});

app.listen(PORT, () => {
  console.log(`Card game server running at http://localhost:${PORT}`);
});
