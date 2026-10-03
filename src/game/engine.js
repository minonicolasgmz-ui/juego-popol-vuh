import { CARDS, CARD_BY_ID, STATS } from './cards.js'

export const RULES = Object.freeze({ heroHp: 30, boardLimit: 5, handLimit: 8, manaLimit: 10, initialMana: 3 })

function normalizeSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0
  let value = 2166136261
  for (const char of String(seed)) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  return value >>> 0
}

function randomGenerator(seed) {
  let value = seed
  return () => {
    value = (value + 0x6D2B79F5) >>> 0
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(cards, random) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

export function createGame({ mode = 'ai', seed = Date.now() } = {}) {
  const normalizedSeed = normalizeSeed(seed)
  const random = randomGenerator(normalizedSeed)
  let sequence = 0
  const instance = (card, player) => ({
    ...card, uid: `p${player}-${card.id}-${++sequence}`, maxHp: card.hp, ready: false,
  })
  const makePlayer = (player) => {
    // Veinticuatro cartas por mazo; cada jugador tiene su propia reserva.
    const pool = CARDS.flatMap((card) => Array.from(
      { length: ['c3', 'c6', 'c7', 'c8'].includes(card.id) ? 3 : 2 },
      () => instance(card, player),
    ))
    const deck = shuffle(pool, random)
    const hand = deck.splice(0, 5)
    const guardian = instance(CARD_BY_ID[player === 1 ? 'c7' : 'c8'], player)
    return {
      hp: RULES.heroHp, maxHp: RULES.heroHp, mana: RULES.initialMana, maxMana: RULES.initialMana,
      hand, deck, board: [{ ...guardian, ready: true }], fatigue: 0, turns: player === 1 ? 1 : 0,
    }
  }
  return {
    mode: mode === 'local' ? 'local' : 'ai', seed: normalizedSeed,
    players: { 1: makePlayer(1), 2: makePlayer(2) },
    turn: 1, round: 1, phase: 'playing', winner: null,
    log: [{ id: 'event-1', text: 'La batalla del alba comienza. Elige el poder que explote la debilidad de tu rival.', type: 'start' }],
    eventSeq: 1, actionSeq: 0, effect: null, notice: null,
  }
}

function copyGame(state) {
  return {
    ...state, log: [...state.log], notice: null, actionSeq: state.actionSeq + 1,
    players: Object.fromEntries([1, 2].map((player) => [player, {
      ...state.players[player],
      hand: state.players[player].hand.map((card) => ({ ...card })),
      board: state.players[player].board.map((card) => ({ ...card })),
      deck: state.players[player].deck.map((card) => ({ ...card })),
    }])),
  }
}

function log(state, text, type = 'ability') {
  state.eventSeq += 1
  state.log.unshift({ id: `event-${state.eventSeq}`, text, type })
  state.log = state.log.slice(0, 16)
}

function effect(state, type, source, target, amount = 0, extra = {}) {
  state.effect = { id: `effect-${state.actionSeq}`, type, source, target, amount, ...extra }
}

function invalid(state, text) {
  return state.notice === text ? state : { ...state, notice: text }
}

function heal(player, amount) {
  const restored = Math.min(amount, RULES.heroHp - player.hp)
  player.hp += restored
  return restored
}

function draw(state, playerId, count = 1) {
  const player = state.players[playerId]
  for (let i = 0; i < count && player.hp > 0; i++) {
    if (!player.deck.length) {
      player.fatigue += 1
      player.hp = Math.max(0, player.hp - player.fatigue)
      log(state, `J${playerId} sufre ${player.fatigue} de fatiga: su mazo está vacío.`, 'fatigue')
      continue
    }
    const card = player.deck.shift()
    if (player.hand.length >= RULES.handLimit) {
      log(state, `La mano de J${playerId} está llena. ${card.name} se pierde.`, 'burn')
    } else {
      player.hand.push(card)
    }
  }
}

function finish(state) {
  for (const player of [1, 2]) {
    state.players[player].board = state.players[player].board.filter((card) => card.hp > 0)
  }
  const dead1 = state.players[1].hp <= 0
  const dead2 = state.players[2].hp <= 0
  if (dead1 || dead2) {
    state.phase = 'gameover'
    state.winner = dead1 && dead2 ? 0 : dead1 ? 2 : 1
    log(state, state.winner === 0 ? 'El cielo y el inframundo caen juntos. Empate.' : `J${state.winner} conquista el amanecer.`, 'victory')
  }
  return state
}

/** Cada disciplina usa la misma regla: poder/2 menos defensa/4, redondeado.
 * La represalia se resuelve simultáneamente, incluso si el defensor cae.
 */
export function combatPreview(attacker, defender, stat = 'fd') {
  if (!attacker || !STATS[stat]) return { damage: 0, retaliation: 0, attackerDies: false, defenderDies: false, stat }
  const attack = attacker[stat]
  const defense = defender?.[stat] ?? 0
  const damage = Math.max(1, Math.ceil(attack / 2) - Math.floor(defense / 4))
  const retaliation = defender ? Math.max(1, Math.ceil(defense / 2) - Math.floor(attack / 4)) : 0
  return {
    damage, retaliation, stat,
    attackerDies: attacker.hp <= retaliation,
    defenderDies: Boolean(defender && defender.hp <= damage),
  }
}

export function getLegalTargets(state, uid) {
  const empty = { creatures: [], hero: false, guarded: false }
  if (state.phase !== 'playing') return empty
  const attacker = state.players[state.turn].board.find((card) => card.uid === uid)
  if (!attacker?.ready) return empty
  const enemyBoard = state.players[state.turn === 1 ? 2 : 1].board
  const guards = enemyBoard.filter((card) => card.keyword === 'Guardia')
  return {
    creatures: (guards.length ? guards : enemyBoard).map((card) => card.uid),
    hero: guards.length === 0, guarded: guards.length > 0,
  }
}

function invokeAbility(state, card) {
  const playerId = state.turn
  const player = state.players[playerId]
  const enemyId = playerId === 1 ? 2 : 1
  const enemy = state.players[enemyId]
  const others = player.board.filter((ally) => ally.uid !== card.uid)
  const combo = others.some((ally) => ally.faction === card.faction)

  switch (card.id) {
    case 'c1':
      draw(state, playerId)
      if (others.some((ally) => ally.faction === 'Hombres')) {
        for (const stat of Object.keys(STATS)) card[stat] += 1
        log(state, 'Vínculo del alba: los gemelos reciben +1 a todos sus poderes.', 'combo')
      }
      break
    case 'c2':
      if (combo) {
        for (const ally of player.board.filter((ally) => ally.faction === 'Soberbios')) {
          ally.maxHp += 2
          ally.hp += 2
        }
        log(state, 'Sol usurpado: los Soberbios reciben +2 de vida máxima.', 'combo')
      }
      break
    case 'c3': {
      heal(player, 3)
      for (const ally of player.board) ally.hp = Math.min(ally.maxHp, ally.hp + 2)
      if (combo) draw(state, playerId)
      log(state, `Ixmucané restaura 3 al héroe y 2 a sus criaturas.${combo ? ' Combo: roba una carta.' : ''}`, combo ? 'combo' : 'heal')
      break
    }
    case 'c4':
      enemy.hp = Math.max(0, enemy.hp - 2)
      if (combo) draw(state, playerId)
      log(state, `Hun-Camé exige un tributo: 2 de daño al héroe rival.${combo ? ' Combo: roba una carta.' : ''}`, combo ? 'combo' : 'damage')
      break
    case 'c5': {
      const damage = combo ? 3 : 2
      for (const defender of enemy.board) defender.hp -= damage
      log(state, `Corazón del cielo: ${damage} de daño a todas las criaturas rivales.`, combo ? 'combo' : 'damage')
      effect(state, 'summon', card.uid, 'enemy-board', damage, { targets: enemy.board.map((defender) => defender.uid), combo })
      break
    }
    case 'c6':
      if (combo) {
        card.fd += 2
        card.hp += 2
        card.maxHp += 2
        log(state, 'Hacedor de montañas: Zipacná recibe +2 de fuerza y vida.', 'combo')
      }
      break
    case 'c7':
      if (others.some((ally) => ['Hombres', 'Héroes'].includes(ally.faction))) {
        for (const stat of Object.keys(STATS)) card[stat] += 1
        log(state, 'Vínculo del alba: Balam-Quitzé recibe +1 a todos sus poderes.', 'combo')
      }
      break
    case 'c8':
      if (combo) {
        draw(state, playerId)
        log(state, 'Los mensajeros de Xibalbá revelan una carta adicional.', 'combo')
      }
      break
    default:
      break
  }
}

function castSpell(state, card) {
  const player = state.players[state.turn]
  const enemyId = state.turn === 1 ? 2 : 1
  const enemy = state.players[enemyId]
  const combo = player.board.some((ally) => ally.faction === card.faction)
  if (card.id === 'c9') {
    // El objetivo automático está descrito en la carta: empate por orden del campo.
    const target = enemy.board.reduce((weakest, candidate) => !weakest || candidate.hp < weakest.hp ? candidate : weakest, null)
    const damage = (target ? 5 : 4) + Number(combo)
    if (target) target.hp -= damage
    else enemy.hp = Math.max(0, enemy.hp - damage)
    log(state, `${card.name} inflige ${damage} a ${target?.name ?? 'el héroe rival'}.${combo ? ' Combo Progenitores.' : ''}`, combo ? 'combo' : 'spell')
    effect(state, 'spell', card.uid, target?.uid ?? `hero-${enemyId}`, damage, { combo })
  } else if (card.id === 'c10') {
    draw(state, state.turn, 2)
    if (combo) player.mana = Math.min(player.maxMana, player.mana + 1)
    log(state, `Pacto de Xibalbá: roba dos cartas.${combo ? ' Combo: recupera 1 maíz.' : ''}`, combo ? 'combo' : 'spell')
    effect(state, 'spell', card.uid, `hero-${state.turn}`, 0, { combo })
  }
}

export function gameReducer(state, action) {
  if (action.type === 'RESET') {
    return action.game ? { ...action.game, notice: null } : createGame({ mode: action.mode ?? state.mode, seed: action.seed ?? state.seed + 1 })
  }
  if (state.phase !== 'playing') return state
  if (action.player && action.player !== state.turn) return invalid(state, 'Es el turno del rival.')

  const playerId = state.turn
  const enemyId = playerId === 1 ? 2 : 1
  const player = state.players[playerId]

  if (action.type === 'PLAY') {
    const handIndex = player.hand.findIndex((card) => card.uid === action.uid)
    const card = player.hand[handIndex]
    if (!card) return invalid(state, 'Selecciona una carta de tu mano.')
    if (card.cost > player.mana) return invalid(state, `Necesitas ${card.cost} maíz para jugar esta carta.`)
    if (card.type !== 'spell' && player.board.length >= RULES.boardLimit) return invalid(state, 'El campo está lleno: máximo cinco criaturas.')
    const next = copyGame(state)
    const current = next.players[playerId]
    const [played] = current.hand.splice(handIndex, 1)
    current.mana -= played.cost
    if (played.type === 'spell') {
      castSpell(next, played)
    } else {
      played.ready = played.keyword === 'Prisa'
      current.board.push(played)
      log(next, `J${playerId} invoca a ${played.name}${played.ready ? ' · Prisa' : ''}.`, 'summon')
      effect(next, 'summon', played.uid, played.uid)
      invokeAbility(next, played)
    }
    return finish(next)
  }

  if (action.type === 'ATTACK') {
    const attacker = player.board.find((card) => card.uid === action.uid)
    if (!attacker) return invalid(state, 'Selecciona una criatura de tu campo.')
    if (!attacker.ready) return invalid(state, 'Esta criatura está agotada. Estará lista en tu próximo turno.')
    if (!STATS[action.stat]) return invalid(state, 'Elige Fuerza, Magia o Astucia.')
    const targets = getLegalTargets(state, action.uid)
    const defender = state.players[enemyId].board.find((card) => card.uid === action.targetUid)
    const hero = action.targetHero === true
    if (hero && action.targetUid) return invalid(state, 'Elige un único objetivo.')
    if (hero ? !targets.hero : !defender || !targets.creatures.includes(action.targetUid)) {
      return invalid(state, targets.guarded ? 'Debes derrotar a las criaturas con Guardia antes de atacar otro objetivo.' : 'Selecciona un objetivo rival válido.')
    }
    const next = copyGame(state)
    const source = next.players[playerId].board.find((card) => card.uid === action.uid)
    const target = hero ? null : next.players[enemyId].board.find((card) => card.uid === action.targetUid)
    const outcome = combatPreview(source, target, action.stat)
    source.ready = false
    source.hp -= outcome.retaliation
    if (target) target.hp -= outcome.damage
    else next.players[enemyId].hp = Math.max(0, next.players[enemyId].hp - outcome.damage)
    log(next, `${source.name} usa ${STATS[action.stat].name}: ${outcome.damage} de daño a ${target?.name ?? 'el héroe rival'}${target ? `; recibe ${outcome.retaliation} de represalia` : ''}.`, 'attack')
    if (source.keyword === 'Drenaje') {
      const restored = heal(next.players[playerId], 2)
      if (restored) log(next, `Drenaje restaura ${restored} de vida a J${playerId}.`, 'heal')
    }
    effect(next, 'attack', source.uid, target?.uid ?? `hero-${enemyId}`, outcome.damage, {
      retaliation: outcome.retaliation, stat: action.stat,
      destroyed: [source, target].filter((card) => card && card.hp <= 0).map((card) => card.uid),
    })
    return finish(next)
  }

  if (action.type === 'END_TURN') {
    const next = copyGame(state)
    next.turn = enemyId
    if (enemyId === 1) next.round += 1
    const incoming = next.players[enemyId]
    if (incoming.turns > 0) incoming.maxMana = Math.min(RULES.manaLimit, incoming.maxMana + 1)
    incoming.turns += 1
    incoming.mana = incoming.maxMana
    for (const card of incoming.board) card.ready = true
    log(next, `Turno de J${enemyId} · ${incoming.mana} maíz disponible.`, 'turn')
    draw(next, enemyId)
    effect(next, 'turn', `hero-${playerId}`, `hero-${enemyId}`)
    return finish(next)
  }
  return state
}

function playValue(card, player, enemy) {
  const combo = player.board.some((ally) => ally.faction === card.faction)
  if (card.id === 'c9') {
    if (!enemy.board.length) return enemy.hp <= 4 + Number(combo) ? 1000 : 6
    const hp = Math.min(...enemy.board.map((creature) => creature.hp))
    return hp <= 5 + Number(combo) ? 12 : 4
  }
  if (card.id === 'c10') return player.hand.length > 6 || !player.deck.length ? -10 : 6 + Number(combo) * 2
  let score = (card.fd + card.pc + card.as) / 6 + card.hp / 2
  if (card.keyword === 'Prisa') score += 3
  if (card.keyword === 'Guardia' && !player.board.some((ally) => ally.keyword === 'Guardia')) score += 2
  if (card.id === 'c3') score += Math.min(3, RULES.heroHp - player.hp) + player.board.reduce((sum, ally) => sum + Math.min(2, ally.maxHp - ally.hp), 0)
  if (card.id === 'c4' && enemy.hp <= 2) return 1000
  if (card.id === 'c5') score += enemy.board.reduce((sum, defender) => sum + (defender.hp <= 2 + Number(combo) ? 6 : 2), 0)
  if (combo) score += 2
  return score
}

/** Devuelve una acción legal y determinista; la UI decide cuándo ejecutarla. */
export function chooseAiAction(state) {
  if (state.phase !== 'playing') return null
  const player = state.players[state.turn]
  const enemy = state.players[state.turn === 1 ? 2 : 1]
  const choices = []

  for (const card of player.hand) {
    if (card.cost <= player.mana && (card.type === 'spell' || player.board.length < RULES.boardLimit)) {
      const action = { type: 'PLAY', uid: card.uid }
      const outcome = gameReducer(state, action)
      const losesToFatigue = outcome.phase === 'gameover' && outcome.winner !== state.turn && outcome.winner !== 0
      choices.push({ action, score: losesToFatigue ? -1000 : playValue(card, player, enemy) })
    }
  }
  for (const attacker of player.board.filter((card) => card.ready)) {
    const targets = getLegalTargets(state, attacker.uid)
    for (const stat of Object.keys(STATS)) {
      if (targets.hero) {
        const { damage } = combatPreview(attacker, null, stat)
        choices.push({ action: { type: 'ATTACK', uid: attacker.uid, targetHero: true, stat }, score: enemy.hp <= damage ? 2000 : damage * 1.9 })
      }
      for (const uid of targets.creatures) {
        const defender = enemy.board.find((card) => card.uid === uid)
        const result = combatPreview(attacker, defender, stat)
        const score = result.damage + (result.defenderDies ? 8 + defender.cost : 0)
          - (result.attackerDies ? 5 + attacker.cost : 0) - result.retaliation * 0.65
          + (defender.keyword === 'Guardia' ? 1 : 0)
        choices.push({ action: { type: 'ATTACK', uid: attacker.uid, targetUid: uid, stat }, score })
      }
    }
  }
  choices.sort((a, b) => b.score - a.score)
  return choices[0]?.score > 0 ? choices[0].action : { type: 'END_TURN' }
}
