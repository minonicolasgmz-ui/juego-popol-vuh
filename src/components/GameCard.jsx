import { Eye, Flame, Heart, Shield, Sparkles, Swords, Wind, Moon } from 'lucide-react'
import './GameCard.css'

const RARITIES = { legendary: 'Legendaria', epic: 'Épica', rare: 'Rara', common: 'Común' }

function CardGlyph({ className = '' }) {
  return <svg className={className} viewBox="0 0 80 80" fill="none" aria-hidden="true">
    <path d="M40 3 77 40 40 77 3 40Z" stroke="currentColor" strokeWidth="1.2" />
    <path d="M40 12 68 40 40 68 12 40Z" stroke="currentColor" strokeWidth="1.2" />
    <path d="M40 20 60 40 40 60 20 40Z" stroke="currentColor" strokeWidth="2" />
    <path d="M30 30h20v20H30zM34 34h12v12H34zM40 3v17m0 40v17M3 40h17m40 0h17M18 18l10 10m24 24 10 10m0-44L52 28M28 52 18 62" stroke="currentColor" strokeWidth="2" />
    <path d="M40 30 50 40 40 50 30 40Z" fill="currentColor" fillOpacity=".6" />
  </svg>
}

function Stat({ label, value, icon, tone }) {
  const Icon = icon
  return <span className={`card-stat stat-${tone}`} title={label}>
    <Icon aria-hidden="true" />
    <b>{value ?? 0}</b>
    <span className="stat-label">{label}</span>
  </span>
}

export default function GameCard({
  card, variant = 'hand', selected = false, playable = false,
  targeting = false, exhausted = false, onClick, onInspect, enemy = false, style,
}) {
  if (!card) return null
  const isSpell = card.type === 'spell'
  const art = Math.max(0, Math.min(7, Number(card.art) || 0))
  const rarity = card.rarity || 'rare'
  const currentHp = card.currentHp ?? card.hp ?? card.health ?? 0
  const maxHp = card.maxHp ?? card.hp ?? currentHp
  const damaged = currentHp < maxHp
  const description = card.description || (typeof card.ability === 'string' ? card.ability : card.ability?.text) || ''
  const lore = typeof card.lore === 'string' ? card.lore : card.lore?.general
  const keyword = card.keyword || (isSpell ? 'Hechizo' : '')
  const classes = [
    'game-card-shell', `card-${variant}`, `card-tone-${card.tone || 'jade'}`,
    `card-rarity-${rarity}`, selected && 'is-selected', playable && 'is-playable',
    targeting && 'is-target', exhausted && 'is-exhausted', enemy && 'is-enemy',
    isSpell && 'is-spell', damaged && 'is-damaged',
  ].filter(Boolean).join(' ')

  const moveShine = (event) => {
    if (event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    event.currentTarget.style.setProperty('--shine-x', `${x * 100}%`)
    event.currentTarget.style.setProperty('--shine-y', `${y * 100}%`)
    event.currentTarget.style.setProperty('--tilt-x', `${(x - .5) * 5}deg`)
    event.currentTarget.style.setProperty('--tilt-y', `${(.5 - y) * 5}deg`)
  }
  const resetShine = (event) => {
    event.currentTarget.style.setProperty('--tilt-x', '0deg')
    event.currentTarget.style.setProperty('--tilt-y', '0deg')
  }

  return <div className={classes} style={style} onPointerMove={moveShine} onPointerLeave={resetShine}>
    <button
      type="button"
      className="game-card"
      onClick={onClick}
      onContextMenu={onInspect ? (event) => { event.preventDefault(); onInspect(card) } : undefined}
      aria-label={`${card.name}. ${RARITIES[rarity] || rarity}. ${card.cost} de energía. Fuerza ${card.fd ?? 0}, poder ${card.pc ?? 0}, astucia ${card.as ?? 0}${!isSpell ? `, vida ${currentHp}` : ''}${keyword ? `. ${keyword}` : ''}`}
      aria-pressed={selected}
      title={variant === 'board' && exhausted ? `${card.name} · Agotado hasta el próximo turno` : undefined}
    >
      <span className="card-face">
        <span className="card-art" style={{ backgroundPosition: `${(art % 4) * 100 / 3}% ${Math.floor(art / 4) * 100}%` }} />
        <span className="card-art-shade" />
        <span className="card-foil" />
        <span className="card-engraving" />
        <span className="card-corner corner-nw" /><span className="card-corner corner-ne" />
        <span className="card-corner corner-sw" /><span className="card-corner corner-se" />
        <span className="card-cost" title={`${card.cost} de energía`}><span>{card.cost}</span></span>
        <span className="card-seal"><CardGlyph /></span>
        <span className="card-rarity">{RARITIES[rarity] || rarity}</span>
        {variant === 'board' && !isSpell && <span className={`card-health${damaged ? ' health-damaged' : ''}`} title={`${currentHp} de ${maxHp} de vida`}><Heart aria-hidden="true" /><b>{currentHp}</b></span>}
        {exhausted && variant === 'board' && <span className="card-exhausted" title="Agotado"><Moon aria-hidden="true" /></span>}
        <span className="card-writing">
          <span className="card-faction">{card.faction}</span>
          <span className="card-name">{card.name}</span>
          <span className="card-title-rule"><span /></span>
          {keyword && <span className="card-keyword">{isSpell ? <Flame aria-hidden="true" /> : <Sparkles aria-hidden="true" />}{keyword}</span>}
          {description && <span className="card-description">{description}</span>}
          {variant === 'inspect' && lore && <span className="card-lore">“{lore}”</span>}
        </span>
        {!isSpell && <span className="card-stat-row">
          <Stat label="FD" value={card.fd} icon={Swords} tone="force" />
          <Stat label="PC" value={card.pc} icon={Shield} tone="power" />
          <Stat label="AS" value={card.as} icon={Wind} tone="wit" />
        </span>}
        {isSpell && <span className="card-spell-type"><Flame aria-hidden="true" />RITUAL ANCESTRAL</span>}
      </span>
      <span className="card-frame-line" />
      {playable && <span className="card-ready-diamond" />}
    </button>
    {onInspect && variant !== 'inspect' && <button type="button" className="inspect-card" aria-label={`Examinar ${card.name}`} onClick={(event) => { event.stopPropagation(); onInspect(card) }}><Eye aria-hidden="true" /></button>}
  </div>
}

export function CardBack({ small = false, style }) {
  return <div className={`card-back${small ? ' card-back-small' : ''}`} style={style} aria-label="Carta oculta del oponente">
    <span className="card-back-border" />
    <span className="card-back-circuit circuit-one" />
    <span className="card-back-circuit circuit-two" />
    <CardGlyph className="card-back-glyph" />
    <span className="card-back-star star-top" /><span className="card-back-star star-bottom" />
    <span className="card-back-wordmark">POPOL VUH</span>
  </div>
}
