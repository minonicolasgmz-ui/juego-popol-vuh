import { useEffect, useReducer, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Brain, Check, ChevronDown, ChevronRight, CircleHelp, Crown, Flame, Leaf, Maximize2, RotateCcw, ScrollText, Settings2, Shield, Sparkles, Swords, Volume2, VolumeX, Wheat, X, Zap } from 'lucide-react'
import GameCard, { CardBack } from './components/GameCard'
import BattleEffects from './components/BattleEffects'
import { CARDS, STATS } from './game/cards'
import { chooseAiAction, combatPreview, createGame, gameReducer, getLegalTargets } from './game/engine'
import './App.css'

const STAT_ICONS = { fd: Swords, pc: Zap, as: Brain }
let audioContext
function sound(type, enabled) {
  if (!enabled) return
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audioContext.state === 'suspended') audioContext.resume()
    const now = audioContext.currentTime
    const notes = type === 'attack' ? [150, 65, 220] : type === 'turn' ? [330, 440, 660] : type === 'error' ? [110] : [440, 660, 880]
    notes.forEach((note, index) => {
      const osc = audioContext.createOscillator(), gain = audioContext.createGain()
      osc.type = type === 'attack' ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(note, now + index * .06)
      osc.frequency.exponentialRampToValueAtTime(note * .65, now + index * .06 + .35)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(.075, now + index * .06 + .01)
      gain.gain.exponentialRampToValueAtTime(.001, now + index * .06 + .45)
      osc.connect(gain); gain.connect(audioContext.destination)
      osc.start(now + index * .06); osc.stop(now + index * .06 + .5)
      osc.onended = () => { osc.disconnect(); gain.disconnect() }
    })
  } catch { /* Sound is optional on browsers without Web Audio. */ }
}

function Sigil({ className = '', size = 36 }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 3 60 32 32 61 4 32Z" stroke="currentColor" strokeWidth="1.5" /><path d="M32 10 53 32 32 54 11 32Z" stroke="currentColor" strokeWidth="1" /><path d="m32 16 8 10-8 8-8-8 8-10Zm-10 17 10 14 10-14M16 30l7 7M48 30l-7 7M32 4v8M32 52v8M4 32h8M52 32h8" stroke="currentColor" strokeWidth="2" /><circle cx="32" cy="26" r="3" fill="currentColor" /></svg>
}

function Modal({ title, eyebrow, onClose, children, wide = false, className = '' }) {
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const before = document.activeElement
    panel.current?.focus()
    function onKey(event) {
      const dialogs = document.querySelectorAll('[role="dialog"]')
      if (dialogs[dialogs.length - 1] !== panel.current) return
      if (event.key === 'Escape') closeRef.current()
      if (event.key !== 'Tab') return
      const buttons = Array.from(panel.current?.querySelectorAll('button:not([disabled]), input, select, [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0)
      if (!buttons?.length) return
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); before?.focus() }
  }, [])
  return <div className="modal-backdrop" onClick={onClose}><section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`modal-panel ${wide ? 'modal-wide' : ''} ${className}`} onClick={event => event.stopPropagation()}><button className="modal-close icon-button" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><div className="modal-heading"><Sigil size={28} /><span>{eyebrow || 'EL LIBRO DEL CONSEJO'}</span><h2>{title}</h2></div>{children}</section></div>
}

function Hero({ player, number, enemy, targetable, onClick, effect }) {
  return <button data-hero-id={`hero-${number}`} className={`hero-portrait ${enemy ? 'enemy-hero' : 'friendly-hero'} ${targetable ? 'hero-targetable' : ''} ${effect?.target === `hero-${number}` && effect.type === 'attack' ? 'hero-hit' : ''}`} onClick={onClick} disabled={!targetable} aria-label={`${enemy ? 'Rival' : 'Tu héroe'}, ${player.hp} de 30 puntos de vida${targetable ? ', atacar' : ''}`}>
    <span className="hero-art" style={{ backgroundPosition: enemy ? '100% 0%' : '66.6667% 100%' }} /><span className="hero-crown"><Crown size={13} /></span><span className="hero-health">{player.hp}</span>

  </button>
}

function Harvest({ onFinish, player }) {
  const [running, setRunning] = useState(false)
  const [view, setView] = useState({ items: [], score: 0, time: 12, position: 50 })
  const area = useRef(null), basket = useRef(50)
  useEffect(() => {
    if (!running) return
    let frame, items = [], score = 0, lastSpawn = 0, previous = 0
    const started = performance.now()
    function tick(now) {
      const elapsed = now - started, delta = Math.min(40, now - (previous || now))
      previous = now
      if (elapsed - lastSpawn > 390) { lastSpawn = elapsed; items.push({ id: now, x: 8 + Math.random() * 84, y: -8, corn: Math.random() > .25 }) }
      items = items.filter(item => {
        item.y += delta * .025
        if (item.y > 87 && item.y < 99 && Math.abs(item.x - basket.current) < 14) { score = Math.max(0, score + (item.corn ? 1 : -2)); return false }
        return item.y < 105
      })
      setView({ items: [...items], score, time: Math.max(0, Math.ceil((12000 - elapsed) / 1000)), position: basket.current })
      if (elapsed < 12000) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running])
  function move(clientX) {
    const rect = area.current?.getBoundingClientRect()
    if (rect) basket.current = Math.max(12, Math.min(88, (clientX - rect.left) / rect.width * 100))
  }
  return <div className="harvest"><p className="muted">Jugador {player} · Atrapa el maíz sagrado y evita las piedras.</p><div className="harvest-hud"><span><Wheat size={18} /> {view.score}</span><span>{view.time}s</span></div><div ref={area} className="harvest-area" onPointerMove={event => move(event.clientX)} onPointerDown={event => { if (!running || view.time === 0 || event.target.closest('button')) return; event.currentTarget.setPointerCapture(event.pointerId); move(event.clientX) }} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault(); if (event.key === 'ArrowLeft') basket.current = Math.max(12, basket.current - 8); if (event.key === 'ArrowRight') basket.current = Math.min(88, basket.current + 8) }} tabIndex={0} aria-label="Cosecha, mueve el puntero o usa las flechas"><div className="harvest-temple"><Sigil size={120} /></div>{view.items.map(item => <span key={item.id} className={`harvest-item ${item.corn ? 'corn-item' : 'stone-item'}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}>{item.corn ? <Wheat size={27} /> : '◆'}</span>)}<div className="harvest-basket" style={{ left: `${view.position}%` }}><Wheat size={25} /></div>{!running && <button className="gold-button harvest-start" onClick={() => { setRunning(true); area.current?.focus() }}>Comenzar cosecha <ArrowRight size={17} /></button>}{view.time === 0 && <div className="harvest-result"><Sparkles size={28} /><h3>{view.score} maíces sagrados</h3><p>Comenzarás con {3 + Math.min(2, Math.floor(view.score / 3))} de energía.</p><button className="gold-button" onClick={() => onFinish(3 + Math.min(2, Math.floor(view.score / 3)))}>Continuar <ArrowRight size={16} /></button></div>}</div><p className="micro muted">Mueve la canasta con el mouse, el dedo o las flechas del teclado.</p></div>
}

function Rules() {
  return <div className="rules-content"><p>El mundo espera un nuevo amanecer. Invoca a los personajes del Popol Vuh y reduce la vida del héroe rival de <strong>30 a 0</strong>.</p><div className="rule-row"><Wheat /><div><h3>El maíz es tu energía</h3><p>Paga el costo para invocar tantas cartas como puedas. Recuperas tu energía y ganas un cristal adicional cada turno, hasta 10.</p></div></div><div className="rule-row"><Swords /><div><h3>Tres caminos al combate</h3><p>Elige una criatura lista y luego Fuerza, Magia o Astucia. Ataca el atributo más débil de tu rival. Las criaturas contraatacan y conservan el daño recibido.</p></div></div><div className="rule-row"><Shield /><div><h3>Protege a tus dioses</h3><p>Debes eliminar a las criaturas con Guardia antes de atacar otros objetivos. Cada criatura ataca una vez por turno; las recién invocadas esperan, salvo que tengan Prisa.</p></div></div><div className="rule-row"><Sparkles /><div><h3>Encuentra tus sinergias</h3><p>Combina personajes de la misma facción para activar sus habilidades. Hay curaciones, robo de cartas, daño en área y bendiciones.</p></div></div><div className="rule-note"><span>ATAJOS DEL DUELO</span><p><kbd>1</kbd> Fuerza <kbd>2</kbd> Magia <kbd>3</kbd> Astucia <kbd>Esc</kbd> Cancelar</p></div></div>
}

export default function App() {
  const [game, dispatch] = useReducer(gameReducer, { mode: 'ai' }, createGame)
  const [selected, setSelected] = useState(null), [stance, setStance] = useState('fd')
  const [dragging, setDragging] = useState(false)
  const [modal, setModal] = useState(null), [inspected, setInspected] = useState(null)
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('popol-sound') !== 'false')
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('popol-motion') === 'true')
  const [collectionFilter, setCollectionFilter] = useState('Todas'), [collectionSearch, setCollectionSearch] = useState('')
  const [showJournal, setShowJournal] = useState(false), [privacy, setPrivacy] = useState(false)
  const [newMode, setNewMode] = useState('ai'), [withHarvest, setWithHarvest] = useState(false)
  const [harvestPlayer, setHarvestPlayer] = useState(1), [harvestMana, setHarvestMana] = useState(3)
  const timers = useRef([]), [toast, setToast] = useState(null)
  const isAiTurn = game.mode === 'ai' && game.turn === 2
  const currentNumber = game.mode === 'ai' ? 1 : game.turn, opponentNumber = currentNumber === 1 ? 2 : 1
  const player = game.players[currentNumber], opponent = game.players[opponentNumber]
  const canAct = !isAiTurn && !privacy && game.phase === 'playing'
  const selectedCard = [...player.hand, ...player.board].find(card => card.uid === selected)
  const inHand = player.hand.some(card => card.uid === selected)
  const attacker = !inHand && selectedCard?.ready ? selectedCard : null
  const targets = attacker ? getLegalTargets(game, attacker.uid) : { creatures: [], hero: false, guarded: false }
  const latestEffect = game.effect

  useEffect(() => {
    if (!isAiTurn || game.phase !== 'playing' || modal || inspected || privacy) return
    const timer = setTimeout(() => dispatch(chooseAiAction(game) || { type: 'END_TURN' }), reducedMotion ? 400 : 1100)
    return () => clearTimeout(timer)
  }, [game, isAiTurn, modal, inspected, privacy, reducedMotion])
  useEffect(() => { if (game.effect) sound(game.effect.type, soundOn) }, [game.effect, soundOn])
  useEffect(() => {
    function onKey(event) {
      if (modal || inspected || privacy || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return
      if (event.key === 'Escape') setSelected(null)
      if (attacker && ['1', '2', '3'].includes(event.key)) setStance(['fd', 'pc', 'as'][Number(event.key) - 1])
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [attacker, modal, inspected, privacy])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function notify(text) {
    setToast(text); timers.current.forEach(clearTimeout)
    timers.current = [setTimeout(() => setToast(null), 2800)]
  }
  function selectCard(card, hand) {
    if (!canAct) return
    if (!hand && !card.ready) { notify('Esta criatura está descansando. Estará lista en tu próximo turno.'); return }
    setSelected(selected === card.uid ? null : card.uid)
  }
  function playHandCard(uid) {
    if (!canAct) return
    const card = player.hand.find(handCard => handCard.uid === uid)
    if (!card) { notify('Selecciona una carta de tu mano para jugarla.'); return }
    if (card.cost > player.mana) { notify('Necesitas más energía de maíz para jugar esta carta.'); sound('error', soundOn); return }
    if (card.type !== 'spell' && player.board.length >= 5) { notify('Tu terreno está lleno: máximo 5 criaturas.'); return }
    dispatch({ type: 'PLAY', uid: card.uid }); setSelected(null); setDragging(false)
  }
  function invoke() {
    if (inHand && selectedCard) playHandCard(selectedCard.uid)
  }
  function allowCardDrop(event) {
    if (!canAct || !event.dataTransfer.types.includes('text/plain')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }
  function dropCard(event) {
    event.preventDefault()
    event.stopPropagation()
    if (!canAct) return
    playHandCard(event.dataTransfer.getData('text/plain'))
  }
  function attack(targetUid, hero = false) {
    if (!canAct || !attacker) return
    if (hero ? !targets.hero : !targets.creatures.includes(targetUid)) { notify('Debes derrotar a las criaturas con Guardia primero.'); return }
    dispatch({ type: 'ATTACK', uid: attacker.uid, targetUid, targetHero: hero, stat: stance }); setSelected(null)
  }
  function endTurn() {
    if (!canAct) return
    setSelected(null); if (game.mode === 'local') setPrivacy(true)
    dispatch({ type: 'END_TURN' })
  }
  function begin(mana1 = 3, mana2 = 3) {
    const fresh = createGame({ mode: newMode })
    fresh.players[1].mana = fresh.players[1].maxMana = mana1; fresh.players[2].mana = fresh.players[2].maxMana = mana2
    dispatch({ type: 'RESET', game: fresh })
    setSelected(null); setDragging(false); setModal(null); setPrivacy(false); setInspected(null); sound('turn', soundOn)
  }
  function startNewGame() { if (withHarvest) { setHarvestPlayer(1); setModal('harvest') } else begin() }
  function finishHarvest(mana) {
    if (harvestPlayer === 1 && newMode === 'local') { setHarvestMana(mana); setHarvestPlayer(2) }
    else begin(harvestPlayer === 1 ? mana : harvestMana, harvestPlayer === 2 ? mana : 3)
  }
  const filteredCards = CARDS.filter(card => (collectionFilter === 'Todas' || card.faction === collectionFilter) && card.name.toLocaleLowerCase('es').includes(collectionSearch.toLocaleLowerCase('es')))

  return <div className={`game-app ${reducedMotion ? 'reduce-motion' : ''}`}>
    <header className="topbar"><a className="brand" href="#arena" aria-label="Popol Vuh, arena" onClick={() => { setModal(null); setInspected(null) }}><Sigil size={42} /><div><span>POPOL VUH</span><small>EL DESPERTAR DE LOS DIOSES</small></div></a><nav aria-label="Navegación principal"><button className={!modal ? 'nav-active' : ''} onClick={() => setModal(null)}><Swords size={16} /> Arena</button><button className={modal === 'collection' ? 'nav-active' : ''} onClick={() => setModal('collection')}><BookOpen size={16} /> Colección <span className="nav-count">{CARDS.length}</span></button><button onClick={() => setModal('rules')}><CircleHelp size={16} /> Cómo jugar</button></nav><div className="topbar-actions"><button className="icon-button sound-toggle" title={soundOn ? 'Silenciar sonido' : 'Activar sonido'} aria-label={soundOn ? 'Silenciar sonido' : 'Activar sonido'} onClick={() => { const next = !soundOn; setSoundOn(next); localStorage.setItem('popol-sound', String(next)); sound('turn', next) }}>{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className="icon-button" aria-label="Ajustes" onClick={() => setModal('settings')}><Settings2 size={18} /></button><button className="new-duel" aria-label="Nuevo duelo" onClick={() => setModal('new')}><RotateCcw size={14} /><span>Nuevo duelo</span></button></div></header>

    <main id="arena" className="arena">
      <BattleEffects effect={latestEffect} reducedMotion={reducedMotion} />
      <div className="arena-background" /><div className="arena-vignette" /><div className="arena-grain" />
      <div className="embers" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ '--i': index, left: `${(index * 73 + 13) % 100}%`, animationDelay: `${index * -.9}s` }} />)}</div>
      <div className="arena-topline"><span><span className="live-dot" /> {game.mode === 'ai' ? 'DUELO CONTRA XIBALBÁ' : 'DUELO LOCAL · 2 JUGADORES'}</span><span>EL TEMPLO DEL PRIMER AMANECER <Sigil size={15} /></span></div>
      <div className="opponent-zone"><div className="opponent-label"><div><span>{game.mode === 'ai' ? 'SEÑOR DE XIBALBÁ' : `JUGADOR ${opponentNumber}`}</span><small>{isAiTurn ? 'Está preparando su siguiente movimiento…' : 'El inframundo aguarda'}</small></div><Hero player={opponent} number={opponentNumber} enemy targetable={canAct && targets.hero} onClick={() => attack(null, true)} effect={latestEffect} /><div className="opponent-energy"><Wheat size={15} /><strong>{opponent.mana}</strong><span>/{opponent.maxMana}</span></div></div><div className="opponent-hand" aria-label={`Mano rival, ${opponent.hand.length} cartas`}>{opponent.hand.map((card, index) => <div key={card.uid} style={{ '--back-angle': `${(index - (opponent.hand.length - 1) / 2) * 6}deg` }}><CardBack small /></div>)}</div></div>

      <div className="battle-layout"><aside className="duel-sidebar"><div className="chapter-mark"><span>CAPÍTULO I</span><div className="small-rule" /><h1>El primer<br /><em>amanecer.</em></h1><p>De la oscuridad,<br />un nuevo mundo.</p></div><div className="round-display"><span className="round-numeral">{String(game.round).padStart(2, '0')}</span><div><span>RONDA</span><small>{canAct ? 'Tu destino te espera' : 'El destino se escribe'}</small></div></div><div className="journal"><button className="journal-toggle" onClick={() => setShowJournal(!showJournal)} aria-expanded={showJournal}><ScrollText size={15} /> Crónica del duelo <ChevronDown size={13} className={showJournal ? 'rotate' : ''} /></button><div className={`journal-events ${showJournal ? 'journal-expanded' : ''}`}>{game.log.slice(0, showJournal ? 8 : 3).map((entry, index) => <div key={entry.id} className={index === 0 ? 'latest-log' : ''}><span className={`log-dot log-${entry.type}`} /><p>{entry.text}</p></div>)}</div></div><div className="sidebar-bottom"><Shield size={13} /><span>Un duelo. Dos destinos.</span></div></aside>

        <section className="battlefield" aria-label="Campo de batalla"><div className="board-row enemy-row"><span className="terrain-label">TERRENO DE XIBALBÁ <span>◆</span></span><div className="board-slots">{Array.from({ length: 5 }, (_, index) => { const card = opponent.board[index], targetable = canAct && targets.creatures.includes(card?.uid), preview = attacker && card ? combatPreview(attacker, card, stance) : null; return <div key={card?.uid || `enemy-${index}`} className={`board-slot ${card ? 'slot-occupied' : ''} ${latestEffect?.target === card?.uid && card ? 'slot-impact' : ''}`} data-card-id={card?.uid}>{card ? <><GameCard card={card} variant="board" enemy targeting={targetable} exhausted={!card.ready} onClick={() => attack(card.uid)} onInspect={() => setInspected(card)} />{targetable && preview && <span className="combat-preview">−{preview.damage} vida{preview.defenderDies ? ' · Letal' : ''}</span>}</> : <div className="empty-slot"><Sigil size={36} /><span>ALTAR {index + 1}</span></div>}</div> })}</div></div>
          <div className="battle-divider"><span /><div><Sigil size={31} /><span>{attacker ? 'ELIGE TU OBJETIVO' : isAiTurn ? 'TURNO DEL RIVAL' : 'LA CREACIÓN ESTÁ EN TUS MANOS'}</span><Sigil size={31} /></div><span /></div>
          <div className="board-row friendly-row" onDragOver={allowCardDrop} onDrop={dropCard}><div className="board-slots">{Array.from({ length: 5 }, (_, index) => { const card = player.board[index]; return <div key={card?.uid || `friendly-${index}`} className={`board-slot ${card ? 'slot-occupied' : ''} ${latestEffect?.type === 'summon' && latestEffect.source === card?.uid && card ? 'slot-summon' : ''} ${latestEffect?.type === 'attack' && latestEffect.source === card?.uid && card ? 'slot-attacking' : ''}`} data-card-id={card?.uid} onDragOver={!card ? allowCardDrop : undefined} onDrop={!card ? dropCard : undefined}>{card ? <GameCard card={card} variant="board" selected={selected === card.uid} playable={canAct && card.ready} exhausted={!card.ready} onClick={() => selectCard(card, false)} onInspect={() => setInspected(card)} /> : <button className={`empty-slot ${inHand && canAct && selectedCard?.type !== 'spell' ? 'slot-invoke' : ''}`} disabled={!inHand || !canAct || selectedCard?.type === 'spell'} onClick={invoke} aria-label={`Altar ${index + 1}${inHand ? ', invocar carta seleccionada' : ', vacío'}`}><Sigil size={36} /><span>{inHand && selectedCard?.type !== 'spell' ? 'INVOCAR AQUÍ' : `ALTAR ${index + 1}`}</span></button>}</div> })}</div><span className="terrain-label friendly-terrain">TU TERRENO <span>◆</span></span></div>
        </section>

        <aside className="turn-sidebar"><div className={`turn-badge ${isAiTurn ? 'rival-turn' : ''}`}><div className="turn-badge-icon">{isAiTurn ? <Flame size={25} /> : <Swords size={25} />}</div><span>{isAiTurn ? 'SU TURNO' : 'TU TURNO'}</span><small>{isAiTurn ? 'Xibalbá mueve sus piezas' : 'Haz que cuente.'}</small></div><div className="mana-display"><div className="mana-top"><Wheat size={23} /><strong>{player.mana}<span> / {player.maxMana}</span></strong></div><span className="mana-caption">ENERGÍA DE MAÍZ</span><div className="mana-crystals" aria-label={`${player.mana} de ${player.maxMana} energía`}>{Array.from({ length: 10 }, (_, index) => <i key={index} className={`${index < player.mana ? 'crystal-full' : ''} ${index >= player.maxMana ? 'crystal-locked' : ''}`} />)}</div></div><button className="end-turn" onClick={endTurn} disabled={!canAct}><span>TERMINAR TURNO</span><ChevronRight size={21} /></button><p className="turn-tip">{isAiTurn ? 'Observa la estrategia de tu rival.' : 'Tu energía se renueva al comenzar el próximo turno.'}</p><div className="deck-display"><div className="deck-stack"><CardBack small /><span>{player.deck.length}</span></div><div><span>TU MAZO</span><small>{player.deck.length} cartas restantes</small></div></div><button className="rules-shortcut" onClick={() => setModal('rules')}><CircleHelp size={13} /> Las reglas del destino</button></aside>
      </div>

      <section className="hand-zone" aria-label="Tu mano"><div className="player-identity"><Hero player={player} number={currentNumber} effect={latestEffect} /><div><span>{game.mode === 'ai' ? 'HEREDERO DEL MAÍZ' : `JUGADOR ${currentNumber}`}</span><small><Leaf size={11} /> Hijos del amanecer</small><div className="hero-hp-track"><i style={{ width: `${player.hp / 30 * 100}%` }} /></div><span className="health-caption">{player.hp} / 30 VIDA</span></div></div><div className="hand-center"><div className="hand-instruction">{privacy ? <><Shield size={13} /><span>Tu mano permanece oculta durante el cambio de jugador</span></> : selectedCard ? <><Sparkles size={13} /><span>{inHand ? selectedCard.cost > player.mana ? 'Energía insuficiente · espera al siguiente turno' : selectedCard.type === 'spell' ? 'Desata el poder de tu hechizo' : 'Invoca esta carta en tu terreno' : 'Elige un atributo y después un objetivo'}</span></> : <><span className="hand-count">{player.hand.length}</span><span>TU MANO</span><span className="instruction-separator">·</span><span className="hand-hint">Selecciona o arrastra una carta</span></>}</div><div className={`player-hand ${player.hand.length >= 6 ? 'large-hand' : ''}`} data-hand-count={player.hand.length} aria-hidden={privacy}>{player.hand.map((card, index) => <div className="hand-card-wrap" key={card.uid} data-card-id={privacy ? undefined : card.uid} draggable={canAct} onDragStart={event => { if (!canAct) { event.preventDefault(); return } setDragging(true); setSelected(card.uid); event.dataTransfer.setData('text/plain', card.uid); event.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => { setDragging(false); setSelected(null) }} style={{ '--fan-rotate': `${(index - (player.hand.length - 1) / 2) * 3}deg`, '--fan-offset': `${Math.abs(index - (player.hand.length - 1) / 2) * 5}px`, '--deal-delay': `${index * 70}ms` }}>{privacy ? <CardBack /> : <GameCard card={card} selected={selected === card.uid} playable={canAct && card.cost <= player.mana} onClick={() => selectCard(card, true)} onInspect={() => setInspected(card)} />}</div>)}</div></div><div className="hand-aside"><Sigil size={48} /><span>EL LIBRO<br />DEL CONSEJO</span><button onClick={() => setModal('collection')}>Ver las cartas <ArrowRight size={12} /></button></div></section>
      {selectedCard && canAct && !dragging && <div className="selection-actions">{inHand ? <><span><strong>{selectedCard.name}</strong><small>{selectedCard.ability}</small></span><button className="gold-button" onClick={invoke} disabled={player.mana < selectedCard.cost || (selectedCard.type !== 'spell' && player.board.length >= 5)}><Sparkles size={16} />{selectedCard.type === 'spell' ? 'Lanzar hechizo' : 'Invocar'} <span>{selectedCard.cost}<Wheat size={12} /></span></button></> : <><span><strong>{selectedCard.name}</strong><small>{targets.guarded ? 'Una Guardia protege al rival' : 'Selecciona un enemigo o el héroe rival'}</small></span><div className="stance-buttons">{Object.keys(STATS).map((stat, index) => { const Icon = STAT_ICONS[stat]; return <button key={stat} className={`stance-${stat} ${stance === stat ? 'stance-active' : ''}`} onClick={() => setStance(stat)}><Icon size={16} /><span>{STATS[stat].name}</span><strong>{selectedCard[stat]}</strong><kbd>{index + 1}</kbd></button> })}</div></>}<button className="icon-button" aria-label="Cancelar selección" onClick={() => setSelected(null)}><X size={18} /></button></div>}

      {toast && <div className="game-toast" role="status"><CircleHelp size={17} />{toast}</div>}
    </main>
    <footer className="bottom-bar"><span><Sigil size={13} /> INSPIRADO EN EL POPOL VUH</span><span>Fuerza. Magia. Astucia.<i /> La historia la escribes tú.</span><button onClick={() => setModal('rules')}><Maximize2 size={11} /> CONOCE TU DESTINO</button></footer>

    {privacy && <Modal title={`Turno del Jugador ${game.turn}`} eyebrow="EL DESTINO CAMBIA DE MANOS" onClose={() => {}} className="privacy-modal"><Shield size={48} /><p>Pasa el dispositivo al Jugador {game.turn}. Su mano permanecerá oculta hasta que esté listo.</p><button className="gold-button" onClick={() => setPrivacy(false)}>Estoy listo <ArrowRight size={17} /></button></Modal>}
    {modal === 'rules' && <Modal title="Escribe tu destino" onClose={() => setModal(null)}><Rules /></Modal>}
    {modal === 'settings' && <Modal title="Tu experiencia" eyebrow="AJUSTES DEL DUELO" onClose={() => setModal(null)}><div className="settings-row"><div><h3>Efectos de sonido</h3><p>Invocaciones, impactos y cambios de turno.</p></div><button className={`toggle ${soundOn ? 'toggle-on' : ''}`} role="switch" aria-checked={soundOn} aria-label="Efectos de sonido" onClick={() => { setSoundOn(!soundOn); localStorage.setItem('popol-sound', String(!soundOn)) }}><i /></button></div><div className="settings-row"><div><h3>Reducir movimiento</h3><p>Una arena más tranquila, con menos animaciones.</p></div><button className={`toggle ${reducedMotion ? 'toggle-on' : ''}`} role="switch" aria-checked={reducedMotion} aria-label="Reducir movimiento" onClick={() => { setReducedMotion(!reducedMotion); localStorage.setItem('popol-motion', String(!reducedMotion)) }}><i /></button></div></Modal>}
    {modal === 'new' && <Modal title="Un nuevo amanecer" eyebrow="ELIGE TU DUELO" onClose={() => setModal(null)}><p className="modal-intro">Dioses antiguos. Nuevas rivalidades. El destino vuelve a empezar.</p><div className="mode-options"><button className={newMode === 'ai' ? 'mode-selected' : ''} onClick={() => setNewMode('ai')}><Flame size={26} /><div><strong>Desafía a Xibalbá</strong><span>Un jugador · Rival con inteligencia propia</span></div>{newMode === 'ai' && <Check size={17} />}</button><button className={newMode === 'local' ? 'mode-selected' : ''} onClick={() => setNewMode('local')}><Swords size={26} /><div><strong>Duelo entre dos mundos</strong><span>Dos jugadores · Un mismo dispositivo</span></div>{newMode === 'local' && <Check size={17} />}</button></div><label className="harvest-option"><input type="checkbox" checked={withHarvest} onChange={event => setWithHarvest(event.target.checked)} /><Wheat size={19} /><span>Comenzar con la Cosecha de Paxil<small>Atrapa maíz para conseguir energía adicional.</small></span></label><button className="gold-button start-duel" onClick={startNewGame}><Swords size={17} /> COMENZAR DUELO <ArrowRight size={17} /></button></Modal>}
    {modal === 'harvest' && <Modal title="La Cosecha de Paxil" eyebrow="ANTES DEL PRIMER AMANECER" onClose={() => setModal('new')}><Harvest key={harvestPlayer} player={harvestPlayer} onFinish={finishHarvest} /></Modal>}
    {modal === 'collection' && <Modal title="Dioses, héroes y leyendas" eyebrow="TU COLECCIÓN · EL LIBRO DEL CONSEJO" onClose={() => setModal(null)} wide><div className="collection-toolbar"><input aria-label="Buscar cartas" placeholder="Busca una leyenda…" value={collectionSearch} onChange={event => setCollectionSearch(event.target.value)} /><span>{filteredCards.length} cartas</span></div><div className="faction-filters">{['Todas', ...new Set(CARDS.map(card => card.faction))].map(faction => <button className={collectionFilter === faction ? 'filter-active' : ''} key={faction} onClick={() => setCollectionFilter(faction)}>{faction}</button>)}</div><div className="collection-grid">{filteredCards.map(card => <GameCard key={card.id} card={card} onClick={() => setInspected(card)} onInspect={() => setInspected(card)} />)}</div>{!filteredCards.length && <p className="empty-search">No hay leyendas con ese nombre.</p>}</Modal>}
    {inspected && <Modal title={inspected.name} eyebrow={`${inspected.faction} · ${inspected.rarity === 'legendary' ? 'LEGENDARIA' : inspected.rarity === 'epic' ? 'ÉPICA' : 'RARA'}`} onClose={() => setInspected(null)} className="inspect-modal"><div className="inspect-layout"><GameCard card={inspected} variant="inspect" /><div className="inspect-description"><blockquote>“{inspected.lore}”</blockquote><span className="inspect-subhead">{inspected.keyword || 'PODER ANCESTRAL'}</span><h3>{inspected.ability}</h3><p>{inspected.description}</p><div className="inspect-stats">{Object.keys(STATS).map(stat => { const Icon = STAT_ICONS[stat]; return <div key={stat} className={`stat-${stat}`}><Icon size={20} /><strong>{inspected[stat]}</strong><span>{STATS[stat].name}</span></div> })}</div>{inspected.type !== 'spell' && <p className="inspect-health"><Shield size={15} /> {inspected.hp} puntos de vida</p>}<p className="inspect-note">Al atacar, infliges la mitad del atributo elegido, reducida por la defensa rival. El contraataque se resuelve al mismo tiempo.</p></div></div></Modal>}
    {game.phase === 'gameover' && !modal && <Modal title={game.winner === 0 ? 'Dos destinos, un mismo final' : game.winner === currentNumber ? 'Un nuevo sol se alza' : 'El inframundo prevalece'} eyebrow={game.winner === 0 ? 'EMPATE' : game.winner === currentNumber ? 'VICTORIA' : 'DERROTA'} onClose={() => setModal('new')} className="victory-modal"><div className="victory-sigil"><Crown size={56} /></div><p>{game.winner === 0 ? 'Ambos héroes han caído. El mundo espera un nuevo duelo.' : game.mode === 'local' ? `El Jugador ${game.winner} ha escrito su destino.` : game.winner === 1 ? 'Los hijos del maíz vivirán para contar tu leyenda.' : 'Incluso los dioses vuelven a intentarlo.'}</p><button className="gold-button" onClick={() => setModal('new')}>Volver a combatir <RotateCcw size={16} /></button></Modal>}
  </div>
}
