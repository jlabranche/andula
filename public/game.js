const gameBoard = document.querySelector('#game-board');
const turnStatus = document.querySelector('#turn-status');
const messageBox = document.querySelector('#message');
const endTurnButton = document.querySelector('#end-turn-button');
const resetButton = document.querySelector('#reset-button');

let gameState = null;

async function fetchGame() {
  const response = await fetch('/api/game');
  gameState = await response.json();
  render();
}

async function postAction(url, body = {}) {
  clearMessage();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.error || 'Something went wrong.');
      return;
    }

    gameState = data;
    render();
  } catch (error) {
    showMessage('Could not reach the game server.');
  }
}

function render() {
  if (!gameState) return;

  const activePlayer = gameState.players[gameState.currentPlayer];
  const status = gameState.winner
    ? `${gameState.winner} wins!`
    : `Turn ${gameState.turnNumber}: ${activePlayer.name}'s turn`;

  turnStatus.textContent = status;
  endTurnButton.disabled = Boolean(gameState.winner);

  gameBoard.innerHTML = gameState.players
    .map((player, index) => renderPlayer(player, index))
    .join('');
}

function renderPlayer(player, index) {
  const isActive = index === gameState.currentPlayer;
  const canAct = isActive && !gameState.winner;
  const classes = [
    'player',
    isActive ? 'active' : '',
    gameState.winner === player.name ? 'winner' : ''
  ].filter(Boolean).join(' ');

  return `
    <article class="${classes}">
      <div class="player-header">
        <div>
          <h2>${player.name}</h2>
          <p class="empty">${isActive && !gameState.winner ? 'Active player' : '&nbsp;'}</p>
        </div>
        <div class="stats">
          <span class="stat">Banner HP: ${player.bannerHp}</span>
          <span class="stat">Coins: ${player.coins}</span>
          <span class="stat">Deck: ${player.deck.length}</span>
        </div>
      </div>

      <section class="zone">
        <h3>Buildings (${player.buildings.length}/3)</h3>
        <div class="buildings">
          ${renderBuildings(player.buildings)}
        </div>
      </section>

      <section class="zone">
        <h3>Build Options</h3>
        <div class="building-options">
          ${renderBuildingOptions(player, canAct)}
        </div>
      </section>

      <section class="zone">
        <h3>Board</h3>
        <div class="cards">
          ${renderBoard(player.board, canAct)}
        </div>
      </section>

      <section class="zone">
        <h3>Hand</h3>
        <div class="cards">
          ${renderHand(player.hand, player.coins, canAct)}
        </div>
      </section>
    </article>
  `;
}

function renderHand(hand, coins, canAct) {
  if (hand.length === 0) {
    return '<p class="empty">No cards in hand.</p>';
  }

  return hand.map((card) => `
    <div class="card">
      <h4>${card.name}</h4>
      <p class="numbers">Cost ${card.cost} | ATK ${card.attack} | HP ${card.health}</p>
      <p>${card.description}</p>
      <button
        ${!canAct || coins < card.cost ? 'disabled' : ''}
        onclick="playCard(${card.id})"
      >
        Play
      </button>
    </div>
  `).join('');
}

function renderBoard(board, canAct) {
  if (board.length === 0) {
    return '<p class="empty">No cards on board.</p>';
  }

  return board.map((card) => `
    <div class="card">
      <h4>${card.name}</h4>
      <p class="numbers">ATK ${card.attack} | HP ${card.health}</p>
      <p>${card.canAttack ? 'Ready to attack.' : 'Cannot attack now.'}</p>
      <button
        ${!canAct || !card.canAttack ? 'disabled' : ''}
        onclick="attackBanner(${card.id})"
      >
        Attack Banner
      </button>
    </div>
  `).join('');
}

function renderBuildings(buildings) {
  if (buildings.length === 0) {
    return '<p class="empty">No buildings constructed.</p>';
  }

  return buildings.map((building) => `
    <div class="building">
      <h4>${building.name}</h4>
      <p class="numbers">Durability ${building.hp}</p>
      <p>${building.effect}</p>
    </div>
  `).join('');
}

function renderBuildingOptions(player, canAct) {
  return player.buildingOptions.map((building) => {
    const cannotBuild = !canAct
      || player.coins < building.cost
      || player.buildings.length >= 3;

    return `
      <div class="building">
        <h4>${building.name}</h4>
        <p class="numbers">Cost ${building.cost} | Durability ${building.hp}</p>
        <p>${building.effect}</p>
        <button
          ${cannotBuild ? 'disabled' : ''}
          onclick="buildBuilding('${building.name}')"
        >
          Build
        </button>
      </div>
    `;
  }).join('');
}

function showMessage(message) {
  messageBox.textContent = message;
  messageBox.hidden = false;
}

function clearMessage() {
  messageBox.textContent = '';
  messageBox.hidden = true;
}

function playCard(cardId) {
  postAction('/api/play-card', { cardId });
}

function attackBanner(cardId) {
  postAction('/api/attack-banner', { cardId });
}

function buildBuilding(buildingName) {
  postAction('/api/build-building', { buildingName });
}

endTurnButton.addEventListener('click', () => {
  postAction('/api/end-turn');
});

resetButton.addEventListener('click', () => {
  postAction('/api/reset');
});

fetchGame();
