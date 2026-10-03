import { useEffect, useRef } from 'react'
import './BattleEffects.css'

const PALETTES = {
  fd: { color: '#f8b950', hot: '#fff4bd' },
  pc: { color: '#72bfff', hot: '#e7f5ff' },
  as: { color: '#70efb9', hot: '#edffe6' },
  summon: { color: '#63efbb', hot: '#e2ffe7' },
  spell: { color: '#c18cff', hot: '#f8eaff' },
}

/** The previous positions survive a combat update so a defeated card still has a destination. */
function capturePositions(arena) {
  const arenaBounds = arena.getBoundingClientRect()
  const positions = new Map()
  for (const element of arena.querySelectorAll('[data-card-id], [data-hero-id]')) {
    const id = element.dataset.cardId || element.dataset.heroId
    if (!id) continue
    const face = element.querySelector('.game-card') || element
    const bounds = face.getBoundingClientRect()
    const art = element.querySelector('.card-art')
    const artStyle = art ? getComputedStyle(art) : null
    positions.set(id, {
      x: bounds.left - arenaBounds.left + bounds.width / 2,
      y: bounds.top - arenaBounds.top + bounds.height / 2,
      width: bounds.width, height: bounds.height,
      art: artStyle?.backgroundImage,
      artPosition: artStyle?.backgroundPosition,
    })
  }
  return positions
}

export default function BattleEffects({ effect, reducedMotion = false }) {
  const overlay = useRef(null)
  const positions = useRef(new Map())
  const previousEffect = useRef(null)

  useEffect(() => {
    const layer = overlay.current
    const arena = layer?.closest('.arena')
    if (!arena) return
    const live = capturePositions(arena)
    positions.current = effect ? new Map([...positions.current, ...live]) : live
    if (!effect) { previousEffect.current = null; return }
    if (previousEffect.current === effect.id) return
    previousEffect.current = effect.id
    if (!['attack', 'summon', 'spell'].includes(effect.type)) return

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const quiet = reducedMotion || motionPreference.matches
    const palette = PALETTES[effect.type === 'attack' ? effect.stat : effect.type] || PALETTES.fd
    const source = positions.current.get(effect.source)
    const target = positions.current.get(effect.target)
    const nodes = new Set(), animations = new Set()
    layer.style.setProperty('--vfx-color', palette.color)
    layer.style.setProperty('--vfx-hot', palette.hot)

    function create(className, point) {
      const node = document.createElement('span')
      node.className = className
      node.style.left = `${point.x}px`
      node.style.top = `${point.y}px`
      layer.append(node)
      nodes.add(node)
      return node
    }
    function animate(node, frames, duration, delay = 0, easing = 'cubic-bezier(.16,1,.3,1)') {
      const animation = node.animate(frames, { duration, delay, easing, fill: 'both' })
      animations.add(animation)
      animation.finished.then(() => {
        animations.delete(animation); nodes.delete(node); node.remove()
      }).catch(() => { /* Cancellation is expected when the next action starts. */ })
    }
    function damage(point, amount, delay = 0) {
      if (!point || !amount) return
      const number = create('vfx-damage', point)
      number.textContent = `−${amount}`
      animate(number, quiet ? [
        { opacity: 0, transform: 'translate(-50%, -50%)' },
        { opacity: 1, offset: .15, transform: 'translate(-50%, -50%)' },
        { opacity: 1, offset: .75, transform: 'translate(-50%, -50%)' },
        { opacity: 0, transform: 'translate(-50%, -50%)' },
      ] : [
        { opacity: 0, transform: 'translate(-50%, -25%) scale(.55)' },
        { opacity: 1, offset: .15, transform: 'translate(-50%, -70%) scale(1.18)' },
        { opacity: 1, offset: .55, transform: 'translate(-50%, -110%) scale(1)' },
        { opacity: 0, transform: 'translate(-50%, -160%) scale(.95)' },
      ], quiet ? 700 : 1050, delay)
    }
    function impact(point, delay = 0, small = false) {
      if (!point || quiet) return
      const ring = create(`vfx-impact${small ? ' vfx-impact-small' : ''}`, point)
      animate(ring, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.2)' },
        { opacity: 1, offset: .12, transform: 'translate(-50%, -50%) scale(.55)' },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(1.7)' },
      ], 540, delay)
      const flash = create('vfx-impact-core', point)
      animate(flash, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.2)' },
        { opacity: .95, offset: .12, transform: 'translate(-50%, -50%) scale(1)' },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(1.6)' },
      ], 330, delay)
      const count = small ? 7 : 12
      for (let index = 0; index < count; index++) {
        const angle = index / count * Math.PI * 2 + .2
        const distance = (small ? 28 : 48) + (index % 3) * 15
        const particle = create('vfx-particle', point)
        animate(particle, [
          { opacity: 0, transform: 'translate(-50%, -50%) scale(.2)' },
          { opacity: 1, offset: .13, transform: 'translate(-50%, -50%) scale(1)' },
          { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(.05)` },
        ], 450 + (index % 4) * 60, delay)
      }
    }
    function travel(from, to, delay = 0, small = false) {
      if (!from || !to || quiet) return 0
      const dx = to.x - from.x, dy = to.y - from.y
      const length = Math.hypot(dx, dy)
      if (length < 8) return 0
      const angle = Math.atan2(dy, dx) * 180 / Math.PI
      const beam = create('vfx-beam', from)
      beam.style.width = `${length}px`
      animate(beam, [
        { opacity: 0, transform: `rotate(${angle}deg) scaleX(0)` },
        { opacity: small ? .5 : .85, offset: .45, transform: `rotate(${angle}deg) scaleX(1)` },
        { opacity: 0, transform: `rotate(${angle}deg) scaleX(1)` },
      ], 470, delay)
      const projectile = create(`vfx-projectile${small ? ' vfx-projectile-small' : ''}`, from)
      animate(projectile, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.3)' },
        { opacity: 1, offset: .12, transform: `translate(calc(-50% + ${dx * .08}px), calc(-50% + ${dy * .08}px)) scale(1)` },
        { opacity: 1, offset: .9, transform: `translate(calc(-50% + ${dx * .92}px), calc(-50% + ${dy * .92}px)) scale(.9)` },
        { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.3)` },
      ], 340, delay, 'cubic-bezier(.5,0,.8,.7)')
      return 315
    }
    function shatter(point, delay) {
      if (!point || quiet) return
      if (point.art && point.art !== 'none') {
        const ghost = create('vfx-fallen-card', point)
        Object.assign(ghost.style, {
          width: `${point.width}px`, height: `${point.height}px`,
          backgroundImage: point.art, backgroundPosition: point.artPosition,
        })
        animate(ghost, [
          { opacity: .7, filter: 'brightness(1.6)', transform: 'translate(-50%, -50%) scale(1)' },
          { opacity: 0, filter: 'brightness(.1)', transform: 'translate(-50%, -35%) scale(.7) rotate(8deg)' },
        ], 550, delay)
      }
      for (let index = 0; index < 8; index++) {
        const angle = index / 8 * Math.PI * 2
        const shard = create('vfx-shard', point)
        animate(shard, [
          { opacity: 0, transform: 'translate(-50%, -50%) scale(.4)' },
          { opacity: .9, offset: .12, transform: 'translate(-50%, -50%) scale(1)' },
          { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(angle) * 85}px), calc(-50% + ${Math.sin(angle) * 65 + 35}px)) rotate(${index * 75}deg) scale(.2)` },
        ], 720, delay)
      }
    }

    if (effect.type === 'attack') {
      const arrival = travel(source, target)
      impact(target, arrival)
      damage(target, effect.amount, arrival)
      if (effect.retaliation) {
        travel(target, source, 150, true)
        impact(source, quiet ? 0 : 430, true)
        damage(source, effect.retaliation, quiet ? 0 : 430)
      }
      for (const uid of effect.destroyed || []) shatter(positions.current.get(uid), arrival + 120)
    } else if (effect.type === 'summon') {
      if (source && !quiet) {
        const aura = create('vfx-summon-aura', source)
        aura.style.width = `${source.width + 48}px`
        aura.style.height = `${source.height + 40}px`
        animate(aura, [
          { opacity: 0, transform: 'translate(-50%, -50%) scale(.75)' },
          { opacity: .9, offset: .2, transform: 'translate(-50%, -50%) scale(1)' },
          { opacity: 0, transform: 'translate(-50%, -50%) scale(1.15)' },
        ], 780)
        impact(source, 0, true)
      }
      for (const uid of effect.targets || []) {
        const destination = positions.current.get(uid)
        const arrival = travel(source, destination, 160, true)
        impact(destination, quiet ? 0 : arrival + 160, true)
        damage(destination, effect.amount, quiet ? 0 : arrival + 160)
      }
    } else {
      const arrival = travel(source, target)
      impact(target, arrival)
      damage(target, effect.amount, arrival)
    }

    function clear() {
      for (const animation of animations) animation.cancel()
      for (const node of nodes) node.remove()
      animations.clear(); nodes.clear()
    }
    function reducePreference(event) { if (event.matches) clear() }
    motionPreference.addEventListener('change', reducePreference)
    return () => { motionPreference.removeEventListener('change', reducePreference); clear() }
  }, [effect, reducedMotion])

  return <div ref={overlay} className="battle-effects" aria-hidden="true" />
}
