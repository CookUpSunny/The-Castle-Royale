export type Suit = 'H' | 'D' | 'C' | 'S';

export interface Card {
  id: string;
  value: number;
  suit: Suit;
}

export interface PlayerState {
  id: string;
  name: string;
  hand: Card[];
  faceUp: Card[];
  faceDown: Card[];
}

export interface GameState {
  gameId: string;
  players: Record<string, PlayerState>;
  playerOrder: [string, string];
  deck: Card[];
  discardPile: Card[];
  currentPlayerId: string;
  phase: 'setup' | 'playing' | 'finished';
  winner?: string;
  // Tracks which players have locked in their castle (face-up) selection during the
  // setup phase. Once both are true the game transitions to 'playing' and the
  // starting player is determined.
  setupReady: Record<string, boolean>;
  /**
   * When set, the named player MUST play one card (any value) to restart the
   * pile after picking it up. Pickup no longer ends their turn — they get a
   * forced "starter" play first. The card lands as the new pile top with no
   * special-card effects (10/2 don't burn or grant extra turn during starter).
   */
  mustPlayStarter?: string;
}

export type PlayEffect = 'normal' | 'reset' | 'burn' | 'set_complete' | 'face_down_bust';

export interface PlayResult {
  effect: PlayEffect;
  burned: boolean;
  extraTurn: boolean;
  gameOver: boolean;
  nextPlayerId: string;
  playedCard: Card;
  /**
   * How many cards were played in this single move (1=single, 2=double,
   * 3=triple, 4=quadruple). The client uses this to trigger the
   * multi-play burst overlay (DOUBLE! / TRIPLE! / QUADRUPLE!).
   */
  playedCount: number;
  /**
   * True when the play came from the player's blind face-down row.
   * The client uses this to trigger a card-flip reveal animation
   * (whether or not the card actually landed on the pile).
   */
  wasFaceDown: boolean;
  /**
   * For face-down reveals: the card that was on top of the pile BEFORE the
   * blind card was committed. The client uses this to show a pile-vs-reveal
   * comparison animation. Undefined when the pile was empty pre-reveal.
   */
  previousTop?: Card;
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['H', 'D', 'C', 'S'];
  const cards: Card[] = [];
  for (const suit of suits) {
    for (let value = 2; value <= 14; value++) {
      cards.push({ id: `${suit}${value}`, value, suit });
    }
  }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i]!;
    a[i] = a[j]!;
    a[j] = temp;
  }
  return a;
}

/**
 * Castle/Palace starting-player rule:
 *   - Whoever holds a 3, 4, or 5 in their hand goes first (lowest wins).
 *   - If neither has 3/4/5, the next-highest non-special card (6, 7, 8, 9, J, Q, K, A)
 *     determines the starter. Specials 2 (wild) and 10 (burn) are skipped.
 *   - If both players hold the same lowest qualifying value, a coin flip decides.
 *   - Last-resort fallback: random.
 */
export function determineStartingPlayer(
  players: Record<string, PlayerState>,
  playerIds: [string, string],
): string {
  const searchOrder = [3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14];
  for (const value of searchOrder) {
    const holders = playerIds.filter((pid) => players[pid]!.hand.some((c) => c.value === value));
    if (holders.length === 1) return holders[0]!;
    if (holders.length === 2) return holders[Math.floor(Math.random() * 2)]!;
  }
  return playerIds[Math.floor(Math.random() * 2)]!;
}

export function dealGame(
  playerIds: [string, string],
  playerNames: [string, string],
): GameState {
  const deck = shuffle(createDeck());
  const players: Record<string, PlayerState> = {};

  for (let i = 0; i < 2; i++) {
    const pid = playerIds[i]!;
    players[pid] = {
      id: pid,
      name: playerNames[i]!,
      faceDown: deck.splice(0, 3),
      faceUp: deck.splice(0, 3),
      hand: deck.splice(0, 3),
    };
  }

  const gameId = `g${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

  // Game starts in 'setup' phase: each player can swap cards between their hand
  // and their face-up "castle" row before play begins. currentPlayerId is just a
  // placeholder until both players confirm — at which point determineStartingPlayer
  // runs and play begins.
  return {
    gameId,
    players,
    playerOrder: playerIds,
    deck,
    discardPile: [],
    currentPlayerId: playerIds[0]!,
    phase: 'setup',
    setupReady: { [playerIds[0]!]: false, [playerIds[1]!]: false },
  };
}

/**
 * Swap one card from a player's hand with one of their face-up castle cards
 * during the setup phase. Returns an error if not in setup phase or if either
 * card id is invalid.
 */
export function swapCards(
  state: GameState,
  playerId: string,
  handCardId: string,
  faceUpCardId: string,
): { newState: GameState } | { error: string } {
  if (state.phase !== 'setup') return { error: 'Not in setup phase' };
  if (state.setupReady[playerId]) return { error: 'Already confirmed' };
  const player = state.players[playerId];
  if (!player) return { error: 'Player not found' };

  const handIdx = player.hand.findIndex((c) => c.id === handCardId);
  const faceUpIdx = player.faceUp.findIndex((c) => c.id === faceUpCardId);
  if (handIdx < 0) return { error: 'Hand card not found' };
  if (faceUpIdx < 0) return { error: 'Face-up card not found' };

  const newHand = [...player.hand];
  const newFaceUp = [...player.faceUp];
  const handCard = newHand[handIdx]!;
  const faceUpCard = newFaceUp[faceUpIdx]!;
  newHand[handIdx] = faceUpCard;
  newFaceUp[faceUpIdx] = handCard;

  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, hand: newHand, faceUp: newFaceUp },
    },
  };
  return { newState };
}

/**
 * Replace the player's entire face-up castle row with the given 3 card ids.
 * The remaining 3 cards from their dealt set (hand + face-up combined) become
 * the new hand. This is the simpler "choose your castle" UX: the player picks
 * which 3 of their 6 dealt cards should be face-up, in any order.
 */
export function setFaceUp(
  state: GameState,
  playerId: string,
  faceUpIds: string[],
): { newState: GameState } | { error: string } {
  if (state.phase !== 'setup') return { error: 'Not in setup phase' };
  if (state.setupReady[playerId]) return { error: 'Already confirmed' };
  const player = state.players[playerId];
  if (!player) return { error: 'Player not found' };

  if (faceUpIds.length !== 3) return { error: 'Must choose exactly 3 face-up cards' };
  const idSet = new Set(faceUpIds);
  if (idSet.size !== 3) return { error: 'Duplicate card ids' };

  const dealtCards = [...player.hand, ...player.faceUp];
  const newFaceUp: Card[] = [];
  for (const id of faceUpIds) {
    const card = dealtCards.find((c) => c.id === id);
    if (!card) return { error: 'Card not in your dealt set' };
    newFaceUp.push(card);
  }
  const newHand: Card[] = dealtCards.filter((c) => !idSet.has(c.id));

  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, hand: newHand, faceUp: newFaceUp },
    },
  };
  return { newState };
}

/**
 * Mark a player as ready in the setup phase. When both players are ready the
 * game transitions to 'playing' and the starting player is decided by the
 * standard Castle rule (lowest 3/4/5 in hand, etc.).
 */
export function confirmSetup(
  state: GameState,
  playerId: string,
): { newState: GameState; started: boolean } | { error: string } {
  if (state.phase !== 'setup') return { error: 'Not in setup phase' };
  if (!state.players[playerId]) return { error: 'Player not found' };

  const newReady = { ...state.setupReady, [playerId]: true };
  const allReady = state.playerOrder.every((id) => newReady[id]);

  if (!allReady) {
    return { newState: { ...state, setupReady: newReady }, started: false };
  }

  const startingPlayerId = determineStartingPlayer(state.players, state.playerOrder);
  return {
    newState: {
      ...state,
      setupReady: newReady,
      phase: 'playing',
      currentPlayerId: startingPlayerId,
    },
    started: true,
  };
}

export function canPlayCard(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return true;
  const top = pile[pile.length - 1]!;
  if (card.value === 2 || card.value === 10) return true;
  if (top.value === 2) return true;
  return card.value >= top.value;
}

function checkSetCompletion(pile: Card[]): boolean {
  if (pile.length < 4) return false;
  const last4 = pile.slice(-4);
  return last4.every((c) => c.value === last4[0]!.value);
}

function getCardFromPlayer(player: PlayerState, cardId: string): Card | null {
  const fromHand = player.hand.find((c) => c.id === cardId);
  if (fromHand) return fromHand;
  if (player.hand.length === 0) {
    const fromFaceUp = player.faceUp.find((c) => c.id === cardId);
    if (fromFaceUp) return fromFaceUp;
    if (player.faceUp.length === 0) {
      const fromFaceDown = player.faceDown.find((c) => c.id === cardId);
      if (fromFaceDown) return fromFaceDown;
    }
  }
  return null;
}

function removeCardFromPlayer(player: PlayerState, cardId: string): void {
  player.hand = player.hand.filter((c) => c.id !== cardId);
  player.faceUp = player.faceUp.filter((c) => c.id !== cardId);
  player.faceDown = player.faceDown.filter((c) => c.id !== cardId);
}

function drawCards(state: GameState, playerId: string): void {
  const player = state.players[playerId]!;
  while (player.hand.length < 3 && state.deck.length > 0) {
    player.hand.push(state.deck.shift()!);
  }
}

function isPlayerEmpty(player: PlayerState): boolean {
  return player.hand.length === 0 && player.faceUp.length === 0 && player.faceDown.length === 0;
}

/**
 * Play one or more cards of the same value at once (doubles, triples, quads).
 *
 * Special-card effects:
 *   - 10 → burn the discard pile and grant an extra turn
 *   - 2  → wild card: any value can be played after, AND the player gets an extra turn
 *   - 4-of-a-kind on top of the pile → burn and grant an extra turn
 *
 * Multi-card plays are validated for: same value, all accessible to the player,
 * no duplicate ids, and the value must be playable on the current pile.
 */
export function playCards(
  state: GameState,
  playerId: string,
  cardIds: string[],
): { result: PlayResult; newState: GameState } | { error: string } {
  if (state.currentPlayerId !== playerId) return { error: 'Not your turn' };
  if (state.phase !== 'playing') return { error: 'Game over' };
  if (cardIds.length === 0) return { error: 'No cards selected' };

  // STARTER MODE: player just picked up the pile and must commit one OR more
  // cards (doubles / triples / quads of the SAME value) to restart it. Skip
  // pile-match validation, suppress specials, then pass turn. This is enforced
  // on the server so clients can't bypass it.
  if (state.mustPlayStarter === playerId) {
    const starterUniqueIds = new Set(cardIds);
    if (starterUniqueIds.size !== cardIds.length) return { error: 'Duplicate card ids' };
    const starterPlayer = state.players[playerId]!;
    const starterCards: Card[] = [];
    for (const id of cardIds) {
      const c = getCardFromPlayer(starterPlayer, id);
      if (!c) return { error: 'Card not found or not accessible' };
      starterCards.push(c);
    }
    const starterValue = starterCards[0]!.value;
    if (!starterCards.every((c) => c.value === starterValue)) {
      return { error: 'Starter cards must all share the same value' };
    }

    const newState: GameState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...starterPlayer,
          hand: [...starterPlayer.hand],
          faceUp: [...starterPlayer.faceUp],
          faceDown: [...starterPlayer.faceDown],
        },
      },
      discardPile: [...starterCards],
      deck: [...state.deck],
      mustPlayStarter: undefined,
    };
    const newStarterPlayer = newState.players[playerId]!;
    for (const c of starterCards) removeCardFromPlayer(newStarterPlayer, c.id);
    drawCards(newState, playerId);

    const gameOver = isPlayerEmpty(newStarterPlayer);
    let nextPlayerId = playerId;
    if (gameOver) {
      newState.phase = 'finished';
      newState.winner = playerId;
    } else {
      const otherId = state.playerOrder.find((id) => id !== playerId)!;
      nextPlayerId = otherId;
      newState.currentPlayerId = otherId;
    }
    return {
      result: {
        effect: 'normal',
        burned: false,
        extraTurn: false,
        gameOver,
        nextPlayerId,
        playedCard: starterCards[starterCards.length - 1]!,
        playedCount: starterCards.length,
        wasFaceDown: false,
      },
      newState,
    };
  }

  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== cardIds.length) return { error: 'Duplicate card ids' };

  const player = state.players[playerId]!;
  const cards: Card[] = [];
  for (const id of cardIds) {
    const c = getCardFromPlayer(player, id);
    if (!c) return { error: 'Card not found or not accessible' };
    cards.push(c);
  }

  const value = cards[0]!.value;
  if (!cards.every((c) => c.value === value)) return { error: 'All cards must be the same value' };

  // Face-down cards are played BLIND — the player commits before knowing what's revealed.
  // If the revealed card can't legally play on the pile, the player busts: pile + revealed
  // card go into their hand and the turn passes (standard Castle/Palace rule).
  const isFromFaceDown =
    cards.length === 1 && player.faceDown.some((c) => c.id === cards[0]!.id);
  const playableNow = canPlayCard(cards[0]!, state.discardPile);
  if (!playableNow && !isFromFaceDown) return { error: 'Cannot play this card' };

  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: [...player.hand],
        faceUp: [...player.faceUp],
        faceDown: [...player.faceDown],
      },
    },
    discardPile: [...state.discardPile],
    deck: [...state.deck],
  };

  const newPlayer = newState.players[playerId]!;
  for (const c of cards) {
    removeCardFromPlayer(newPlayer, c.id);
    newState.discardPile.push(c);
  }

  // Face-down bust: the revealed card couldn't be played → player picks up
  // the entire discard pile (including the just-revealed card). They keep the
  // turn but enter STARTER mode — they must commit one card to restart the pile.
  if (isFromFaceDown && !playableNow) {
    // The pre-reveal pile top is what the revealed card was supposed to beat.
    // newState.discardPile already includes the just-pushed reveal at the end,
    // so the prior top is the second-to-last entry (or undefined if pile only
    // ever held the reveal).
    const previousTop = newState.discardPile.length >= 2
      ? newState.discardPile[newState.discardPile.length - 2]
      : undefined;

    newPlayer.hand.push(...newState.discardPile);
    newState.discardPile = [];
    newState.mustPlayStarter = playerId;
    // currentPlayerId is unchanged — they need to play a starter card next.
    return {
      result: {
        effect: 'face_down_bust',
        burned: false,
        extraTurn: false,
        gameOver: false,
        nextPlayerId: playerId,
        playedCard: cards[0]!,
        playedCount: cards.length,
        wasFaceDown: true,
        previousTop,
      },
      newState,
    };
  }

  let burned = false;
  let extraTurn = false;
  let effect: PlayEffect = 'normal';

  if (value === 10) {
    newState.discardPile = [];
    burned = true;
    extraTurn = true;
    effect = 'burn';
  } else if (value === 2) {
    extraTurn = true;
    effect = 'reset';
  } else if (checkSetCompletion(newState.discardPile)) {
    newState.discardPile = [];
    burned = true;
    extraTurn = true;
    effect = 'set_complete';
  }

  drawCards(newState, playerId);

  const gameOver = isPlayerEmpty(newPlayer);
  let nextPlayerId = playerId;

  if (gameOver) {
    newState.phase = 'finished';
    newState.winner = playerId;
  } else if (!extraTurn) {
    const otherId = state.playerOrder.find((id) => id !== playerId)!;
    nextPlayerId = otherId;
    newState.currentPlayerId = otherId;
  }

  // For face-down reveals that LAND, capture what was on top of the pile
  // before the reveal so the client can show the pile-vs-reveal comparison.
  // newState.discardPile now ends with the revealed card; the prior top is
  // the second-to-last entry.
  const previousTop = isFromFaceDown && newState.discardPile.length >= 2
    ? newState.discardPile[newState.discardPile.length - 2]
    : undefined;

  return {
    result: {
      effect,
      burned,
      extraTurn,
      gameOver,
      nextPlayerId,
      playedCard: cards[cards.length - 1]!,
      playedCount: cards.length,
      wasFaceDown: isFromFaceDown,
      previousTop,
    },
    newState,
  };
}

/** Backward-compatible single-card wrapper around playCards(). */
export function playCard(
  state: GameState,
  playerId: string,
  cardId: string,
): { result: PlayResult; newState: GameState } | { error: string } {
  return playCards(state, playerId, [cardId]);
}

export function pickupPile(
  state: GameState,
  playerId: string,
): { newState: GameState } | { error: string } {
  if (state.currentPlayerId !== playerId) return { error: 'Not your turn' };
  if (state.phase !== 'playing') return { error: 'Game over' };
  if (state.discardPile.length === 0) return { error: 'Pile is empty' };

  const player = state.players[playerId]!;
  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand: [...player.hand, ...state.discardPile],
        faceUp: [...player.faceUp],
        faceDown: [...player.faceDown],
      },
    },
    discardPile: [],
    deck: [...state.deck],
  };

  // Don't pass the turn — picking up forces a "starter" play immediately
  // afterward. The player must commit one card to restart the pile.
  newState.mustPlayStarter = playerId;

  return { newState };
}

export function getGameView(state: GameState, playerId: string): Record<string, unknown> {
  const myPlayer = state.players[playerId]!;
  const opponentId = state.playerOrder.find((id) => id !== playerId)!;
  const opponent = state.players[opponentId]!;
  const topCard = state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;

  let canFastPlay = false;
  if (topCard && state.currentPlayerId === playerId) {
    const allMyCards = [...myPlayer.hand, ...myPlayer.faceUp];
    canFastPlay = allMyCards.some((c) => c.value === topCard.value && c.id !== topCard.id);
  }

  return {
    gameId: state.gameId,
    myPlayerId: playerId,
    opponentPlayerId: opponentId,
    opponentName: opponent.name,
    myHand: myPlayer.hand,
    myFaceUp: myPlayer.faceUp,
    myFaceDownCount: myPlayer.faceDown.length,
    myFaceDownIds: myPlayer.faceDown.map((c) => c.id),
    opponentHandCount: opponent.hand.length,
    // During setup the opponent's castle isn't locked in yet, so don't reveal
    // their evolving face-up choices. Once playing starts, faceUp is public.
    opponentFaceUp: state.phase === 'setup' ? [] : opponent.faceUp,
    opponentFaceDownCount: opponent.faceDown.length,
    discardPile: state.discardPile,
    deckCount: state.deck.length,
    currentPlayerId: state.currentPlayerId,
    isMyTurn: state.currentPlayerId === playerId,
    phase: state.phase,
    winner: state.winner,
    canFastPlay,
    myReady: state.setupReady?.[playerId] ?? false,
    opponentReady: state.setupReady?.[opponentId] ?? false,
    mustPlayStarter: state.mustPlayStarter === playerId,
  };
}
