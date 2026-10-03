import test from 'node:test'
import assert from 'node:assert/strict'
import { CARD_BY_ID } from './cards.js'
import { createGame, gameReducer, chooseAiAction, combatPreview, getLegalTargets, RULES } from './engine.js'

function card(id, uid, extra = {}) {
  const base = CARD_BY_ID[id]
  return { ...base, uid, maxHp: base.hp, ready: false, ...extra }
}

function scenario({ hand = [], board = [], enemyBoard = [], mana = 10 } = {}) {
  const game = createGame({ seed: 12 })
  game.players[1] = { ...game.players[1], mana, maxMana: mana, hand, board }
  game.players[2] = { ...game.players[2], board: enemyBoard }
  return game
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) deepFreeze(nested)
  }
  return value
}

test('la misma semilla produce la misma partida y todos los identificadores son únicos', () => {
  const game = createGame({ mode: 'local', seed: 'alba' })
  assert.deepEqual(game, createGame({ mode: 'local', seed: 'alba' }))
  assert.notDeepEqual(game.players[1].hand, createGame({ seed: 'noche' }).players[1].hand)
  const all = Object.values(game.players).flatMap((player) => [...player.hand, ...player.deck, ...player.board])
  assert.equal(all.length, 50)
  assert.equal(new Set(all.map((item) => item.uid)).size, all.length)
  assert.equal(game.players[1].hand.length, 5)
  assert.equal(game.players[2].hand.length, 5)
  assert.equal(game.players[1].board[0].id, 'c7')
  assert.equal(game.players[2].board[0].id, 'c8')
})

test('el reductor conserva el estado anterior y permite varias invocaciones por turno', () => {
  const state = deepFreeze(scenario({ hand: [card('c7', 'one'), card('c8', 'two')], mana: 4 }))
  const first = gameReducer(state, { type: 'PLAY', uid: 'one' })
  const next = gameReducer(first, { type: 'PLAY', uid: 'two' })
  assert.equal(state.players[1].hand.length, 2)
  assert.equal(state.players[1].mana, 4)
  assert.equal(state.players[1].board.length, 0)
  assert.equal(next.players[1].board.length, 2)
  assert.equal(next.players[1].mana, 0)
  assert.ok(next.players[1].board.every((item) => item.ready === false))
})

test('Guardia protege al héroe y a las demás criaturas', () => {
  const state = scenario({
    board: [card('c1', 'attacker', { ready: true })],
    enemyBoard: [card('c8', 'guard'), card('c3', 'healer')],
  })
  assert.deepEqual(getLegalTargets(state, 'attacker'), { creatures: ['guard'], hero: false, guarded: true })
  const faceAttempt = gameReducer(state, { type: 'ATTACK', uid: 'attacker', targetHero: true, stat: 'as' })
  const healerAttempt = gameReducer(state, { type: 'ATTACK', uid: 'attacker', targetUid: 'healer', stat: 'as' })
  assert.equal(faceAttempt.players, state.players)
  assert.equal(healerAttempt.players, state.players)
  assert.match(faceAttempt.notice, /Guardia/)
  assert.equal(faceAttempt.players[2].hp, 30)
  assert.equal(state.players[1].board[0].ready, true)
})

test('el daño persiste y la represalia es simultánea; cada criatura ataca una sola vez', () => {
  const state = scenario({
    board: [card('c1', 'attacker', { ready: true })],
    enemyBoard: [card('c2', 'defender')],
  })
  assert.deepEqual(combatPreview(state.players[1].board[0], state.players[2].board[0], 'as'), {
    damage: 5, retaliation: 1, stat: 'as', attackerDies: false, defenderDies: false,
  })
  const next = gameReducer(state, { type: 'ATTACK', uid: 'attacker', targetUid: 'defender', stat: 'as' })
  assert.equal(next.players[1].board[0].hp, 5)
  assert.equal(next.players[2].board[0].hp, 4)
  assert.equal(next.players[1].board[0].ready, false)
  const repeated = gameReducer(next, { type: 'ATTACK', uid: 'attacker', targetUid: 'defender', stat: 'as' })
  assert.equal(repeated.players, next.players)
  assert.match(repeated.notice, /agotada/)

  const mutual = scenario({
    board: [card('c7', 'one', { ready: true, hp: 1 })],
    enemyBoard: [card('c8', 'two', { hp: 1 })],
  })
  const deaths = gameReducer(mutual, { type: 'ATTACK', uid: 'one', targetUid: 'two', stat: 'fd' })
  assert.equal(deaths.players[1].board.length, 0)
  assert.equal(deaths.players[2].board.length, 0)
  assert.deepEqual(deaths.effect.destroyed, ['one', 'two'])
})

test('elegir una disciplina débil del defensor cambia el enfrentamiento', () => {
  const attacker = card('c1', 'attacker')
  const defender = card('c2', 'defender')
  const strength = combatPreview(attacker, defender, 'fd')
  const cunning = combatPreview(attacker, defender, 'as')
  assert.ok(cunning.damage > strength.damage)
  assert.ok(cunning.retaliation < strength.retaliation)
})

test('Prisa permite atacar al invocar y el turno propio reactiva las criaturas', () => {
  const state = scenario({ hand: [card('c1', 'twins'), card('c7', 'guard')], mana: 6 })
  let next = gameReducer(state, { type: 'PLAY', uid: 'twins' })
  next = gameReducer(next, { type: 'PLAY', uid: 'guard' })
  assert.equal(next.players[1].board.find((item) => item.uid === 'twins').ready, true)
  assert.equal(next.players[1].board.find((item) => item.uid === 'guard').ready, false)
  next = gameReducer(next, { type: 'END_TURN' })
  assert.equal(next.turn, 2)
  assert.equal(next.players[2].mana, 3, 'J2 mantiene el mismo maíz inicial en su primer turno')
  next = gameReducer(next, { type: 'END_TURN' })
  assert.equal(next.round, 2)
  assert.equal(next.players[1].mana, 7)
  assert.ok(next.players[1].board.every((item) => item.ready))
})

test('el vínculo del alba y los Soberbios activan mejoras reales al invocar', () => {
  const state = scenario({ board: [card('c7', 'human')], hand: [card('c1', 'twins')] })
  const next = gameReducer(state, { type: 'PLAY', uid: 'twins' })
  const twins = next.players[1].board.find((item) => item.uid === 'twins')
  assert.equal(twins.fd, 6)
  assert.equal(twins.pc, 8)
  assert.equal(twins.as, 11)
  assert.equal(next.players[1].deck.length, state.players[1].deck.length - 1)

  const sovereign = scenario({ board: [card('c6', 'mountain')], hand: [card('c2', 'sun')] })
  const boosted = gameReducer(sovereign, { type: 'PLAY', uid: 'sun' })
  assert.equal(boosted.players[1].board[0].maxHp, 9)
  assert.equal(boosted.players[1].board[0].hp, 9)
  assert.equal(boosted.players[1].board[1].maxHp, 11)
  const mountain = scenario({ board: [card('c2', 'sun')], hand: [card('c6', 'mountain')] })
  const zip = gameReducer(mountain, { type: 'PLAY', uid: 'mountain' }).players[1].board[1]
  assert.equal(zip.fd, 11)
  assert.equal(zip.hp, 9)
})

test('restauración y drenaje respetan los máximos de vida', () => {
  const state = scenario({ hand: [card('c3', 'healer')], board: [card('c7', 'guard', { hp: 5 })] })
  state.players[1].hp = 29
  const healed = gameReducer(state, { type: 'PLAY', uid: 'healer' })
  assert.equal(healed.players[1].hp, 30)
  assert.equal(healed.players[1].board[0].hp, 6)
  assert.equal(healed.players[1].board[1].hp, 4)

  const drain = scenario({ board: [card('c4', 'lord', { ready: true })] })
  drain.players[1].hp = 27
  const hit = gameReducer(drain, { type: 'ATTACK', uid: 'lord', targetHero: true, stat: 'as' })
  assert.equal(hit.players[1].hp, 29)
  assert.equal(hit.players[2].hp, 25)
})

test('la tormenta mejora con Progenitores y retira a todas las criaturas que mueren', () => {
  const state = scenario({
    board: [card('c3', 'healer')], hand: [card('c5', 'storm')],
    enemyBoard: [card('c8', 'owl', { hp: 3 }), card('c6', 'mountain', { hp: 5 })],
  })
  const next = gameReducer(state, { type: 'PLAY', uid: 'storm' })
  assert.equal(next.players[2].board.length, 1)
  assert.equal(next.players[2].board[0].hp, 2)
  assert.equal(next.effect.amount, 3)
  assert.equal(next.effect.combo, true)
})

test('el límite del campo impide criaturas pero permite hechizos; el sol ataca al más herido', () => {
  const state = scenario({
    board: Array.from({ length: 5 }, (_, i) => card('c7', `guard-${i}`)),
    hand: [card('c7', 'blocked'), card('c9', 'spell')],
    enemyBoard: [card('c6', 'healthy'), card('c8', 'wounded', { hp: 2 })],
  })
  const denied = gameReducer(state, { type: 'PLAY', uid: 'blocked' })
  assert.equal(denied.players, state.players)
  assert.match(denied.notice, /cinco/)
  const next = gameReducer(state, { type: 'PLAY', uid: 'spell' })
  assert.equal(next.players[1].board.length, 5)
  assert.equal(next.players[2].board.length, 1)
  assert.equal(next.players[2].board[0].uid, 'healthy')
  assert.equal(next.players[1].mana, 7)
  assert.equal(next.effect.target, 'wounded')
})

test('la mano llena quema cartas y la fatiga crece con cada robo del mazo vacío', () => {
  const state = createGame({ seed: 32 })
  state.players[2].hand = Array.from({ length: 8 }, (_, i) => card('c7', `full-${i}`))
  const next = gameReducer(state, { type: 'END_TURN' })
  assert.equal(next.players[2].hand.length, 8)
  assert.equal(next.players[2].deck.length, state.players[2].deck.length - 1)
  assert.ok(next.log.some((event) => event.type === 'burn'))

  const empty = scenario({ hand: [card('c10', 'pact')] })
  empty.players[1].deck = []
  const fatigued = gameReducer(empty, { type: 'PLAY', uid: 'pact' })
  assert.equal(fatigued.players[1].fatigue, 2)
  assert.equal(fatigued.players[1].hp, 27)
  assert.equal(fatigued.players[1].hand.length, 0)
})

test('mana insuficiente, jugador equivocado y objetivos ambiguos no alteran el combate', () => {
  const state = scenario({ hand: [card('c5', 'storm')], board: [card('c1', 'twins', { ready: true })], mana: 1 })
  for (const action of [
    { type: 'PLAY', uid: 'storm' },
    { type: 'PLAY', uid: 'missing' },
    { type: 'ATTACK', uid: 'twins', targetHero: true, stat: 'invalid' },
    { type: 'ATTACK', uid: 'twins', targetHero: true, targetUid: 'enemy', stat: 'as' },
    { type: 'END_TURN', player: 2 },
  ]) {
    const rejected = gameReducer(state, action)
    assert.equal(rejected.players, state.players)
    assert.equal(rejected.turn, state.turn)
    assert.ok(rejected.notice)
  }
})

test('la victoria bloquea nuevas acciones y RESET admite partida personalizada', () => {
  const state = scenario({ board: [card('c1', 'twins', { ready: true })] })
  state.players[2].hp = 5
  const next = gameReducer(state, { type: 'ATTACK', uid: 'twins', targetHero: true, stat: 'as' })
  assert.equal(next.phase, 'gameover')
  assert.equal(next.winner, 1)
  assert.equal(gameReducer(next, { type: 'END_TURN' }), next)
  assert.equal(chooseAiAction(next), null)

  const custom = createGame({ mode: 'local', seed: 88 })
  custom.players[2].mana = 5
  custom.players[2].maxMana = 5
  const reset = gameReducer(next, { type: 'RESET', game: custom })
  assert.equal(reset.mode, 'local')
  assert.equal(gameReducer(reset, { type: 'END_TURN' }).players[2].mana, 5)
  assert.equal(gameReducer(next, { type: 'RESET', mode: 'ai', seed: 90 }).seed, 90)
})

test('la IA encuentra daño letal antes de invocar y sus partidas completas conservan invariantes', () => {
  const lethal = scenario({ board: [card('c1', 'twins', { ready: true })], hand: [card('c5', 'storm')] })
  lethal.players[2].hp = 5
  const action = chooseAiAction(lethal)
  assert.equal(action.type, 'ATTACK')
  assert.equal(action.targetHero, true)
  assert.equal(gameReducer(lethal, action).phase, 'gameover')

  for (let seed = 1; seed <= 16; seed++) {
    let game = createGame({ seed })
    for (let move = 0; move < 500 && game.phase === 'playing'; move++) {
      const previous = JSON.stringify(game)
      const action = chooseAiAction(game)
      const next = gameReducer(game, action)
      assert.equal(JSON.stringify(game), previous, `mutación en semilla ${seed}`)
      assert.notEqual(next, game)
      assert.equal(next.notice, null)
      const uids = []
      for (const player of Object.values(next.players)) {
        assert.ok(player.hp >= 0 && player.hp <= RULES.heroHp)
        assert.ok(player.mana >= 0 && player.mana <= player.maxMana)
        assert.ok(player.maxMana <= RULES.manaLimit)
        assert.ok(player.hand.length <= RULES.handLimit)
        assert.ok(player.board.length <= RULES.boardLimit)
        for (const creature of player.board) assert.ok(creature.hp > 0 && creature.hp <= creature.maxHp)
        uids.push(...[...player.hand, ...player.board, ...player.deck].map((item) => item.uid))
      }
      assert.equal(new Set(uids).size, uids.length)
      game = next
    }
    assert.equal(game.phase, 'gameover', `la partida ${seed} no termina`)
    assert.ok([0, 1, 2].includes(game.winner))
  }
})

test('la IA evita un robo con fatiga letal cuando puede curarse', () => {
  const state = scenario({ hand: [card('c1', 'twins'), card('c3', 'healer')], mana: 6 })
  state.players[1].hp = 3
  state.players[1].fatigue = 3
  state.players[1].deck = []
  assert.equal(gameReducer(state, { type: 'PLAY', uid: 'twins' }).winner, 2)
  const action = chooseAiAction(state)
  assert.equal(action.type, 'PLAY')
  assert.equal(action.uid, 'healer')
  assert.equal(gameReducer(state, action).players[1].hp, 6)
})

test('daño al rival y fatiga propia en una misma invocación pueden producir empate', () => {
  const state = scenario({ hand: [card('c4', 'lord')], board: [card('c8', 'owl')] })
  state.players[1].hp = 1
  state.players[1].deck = []
  state.players[2].hp = 2
  const next = gameReducer(state, { type: 'PLAY', uid: 'lord' })
  assert.equal(next.players[1].hp, 0)
  assert.equal(next.players[2].hp, 0)
  assert.equal(next.phase, 'gameover')
  assert.equal(next.winner, 0)
})
