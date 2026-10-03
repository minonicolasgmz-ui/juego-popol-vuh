export const STATS = Object.freeze({
  fd: { name: 'Fuerza', short: 'FUE', color: 'red', description: 'Enfrenta tu fuerza con la del objetivo.' },
  pc: { name: 'Magia', short: 'MAG', color: 'violet', description: 'Enfrenta tu magia con la del objetivo.' },
  as: { name: 'Astucia', short: 'AST', color: 'jade', description: 'Enfrenta tu astucia con la del objetivo.' },
})

// Las cifras representan el poder en cada disciplina. El motor convierte ese
// poder en daño, y conserva la vida de las criaturas entre enfrentamientos.
export const CARDS = Object.freeze([
  {
    id: 'c1', name: 'Hunahpú e Ixbalanqué', faction: 'Héroes', type: 'creature',
    cost: 4, fd: 5, pc: 7, as: 10, hp: 6, rarity: 'legendary',
    keyword: 'Prisa', ability: 'Engaño divino', art: 0, tone: 'jade',
    description: 'Prisa. Al invocar, roba una carta. Vínculo del alba: si controlas Hombres, gana +1 en sus tres poderes.',
    lore: 'Los gemelos descienden a Xibalbá. Donde la muerte impone sus reglas, ellos inventan una nueva jugada.',
  },
  {
    id: 'c2', name: 'Vucub-Caquix', faction: 'Soberbios', type: 'creature',
    cost: 5, fd: 10, pc: 2, as: 2, hp: 9, rarity: 'epic',
    keyword: 'Guardia', ability: 'Sol usurpado', art: 1, tone: 'gold',
    description: 'Guardia. Combo Soberbios: si controlas otro Soberbio, todos tus Soberbios ganan +2 de vida máxima y se curan 2.',
    lore: 'Su plumaje de oro incendia el horizonte. Se proclama sol y luna, aunque el verdadero amanecer todavía no ha llegado.',
  },
  {
    id: 'c3', name: 'Ixmucané', faction: 'Progenitores', type: 'creature',
    cost: 2, fd: 1, pc: 8, as: 6, hp: 4, rarity: 'rare',
    keyword: 'Restauración', ability: 'Memoria del maíz', art: 2, tone: 'jade',
    description: 'Al invocar, cura 3 a tu héroe y 2 a tus criaturas. Combo Progenitores: roba una carta si controlas otro Progenitor.',
    lore: 'En sus manos, el maíz se vuelve carne y memoria. La abuela del alba recuerda el mundo antes de que tuviera nombre.',
  },
  {
    id: 'c4', name: 'Hun-Camé', faction: 'Xibalbá', type: 'creature',
    cost: 5, fd: 8, pc: 6, as: 9, hp: 7, rarity: 'legendary',
    keyword: 'Drenaje', ability: 'Tributo de las sombras', art: 3, tone: 'violet',
    description: 'Al invocar, inflige 2 al héroe rival. Drenaje: cada ataque cura 2 a tu héroe. Combo Xibalbá: roba una carta.',
    lore: 'En el trono de hueso, una sentencia basta para apagar una vida. El señor del inframundo siempre exige un tributo.',
  },
  {
    id: 'c5', name: 'Huracán', faction: 'Progenitores', type: 'creature',
    cost: 6, fd: 10, pc: 10, as: 5, hp: 8, rarity: 'legendary',
    keyword: 'Tormenta', ability: 'Corazón del cielo', art: 4, tone: 'gold',
    description: 'Al invocar, inflige 2 a todas las criaturas rivales. Combo Progenitores: la tormenta inflige 3.',
    lore: 'Una sola pierna sostiene la tempestad. Su voz atraviesa las aguas y ordena que la tierra emerja de la oscuridad.',
  },
  {
    id: 'c6', name: 'Zipacná', faction: 'Soberbios', type: 'creature',
    cost: 3, fd: 9, pc: 3, as: 2, hp: 7, rarity: 'epic',
    keyword: 'Guardia', ability: 'Hacedor de montañas', art: 5, tone: 'red',
    description: 'Guardia. Combo Soberbios: si controlas otro Soberbio, gana +2 de fuerza y +2 de vida máxima.',
    lore: 'Carga montañas como otros cargan piedras. Bajo su sombra, hasta los árboles olvidan la luz.',
  },
  {
    id: 'c7', name: 'Balam-Quitzé', faction: 'Hombres', type: 'creature',
    cost: 2, fd: 5, pc: 5, as: 7, hp: 6, rarity: 'rare',
    keyword: 'Guardia', ability: 'Vigilia del jaguar', art: 6, tone: 'gold',
    description: 'Guardia. Vínculo del alba: si controlas otro Hombre o un Héroe, gana +1 en sus tres poderes.',
    lore: 'Primer hombre de maíz, primer guardián del fuego. Sus ojos de jaguar contemplan la promesa del amanecer.',
  },
  {
    id: 'c8', name: 'Señores Búhos', faction: 'Xibalbá', type: 'creature',
    cost: 2, fd: 3, pc: 4, as: 8, hp: 4, rarity: 'rare',
    keyword: 'Guardia', ability: 'Mensajeros del ocaso', art: 7, tone: 'violet',
    description: 'Guardia. Combo Xibalbá: al invocar, roba una carta si controlas otra criatura de Xibalbá.',
    lore: 'Cuatro mensajeros cruzan la noche sin hacer ruido. Sus alas llevan una invitación que ningún mortal desea recibir.',
  },
  {
    id: 'c9', name: 'Fuego del primer sol', faction: 'Progenitores', type: 'spell',
    cost: 3, fd: 0, pc: 0, as: 0, hp: 0, rarity: 'epic',
    keyword: 'Hechizo', ability: 'Purificación', art: 4, tone: 'red',
    description: 'Inflige 5 a la criatura rival con menos vida, o 4 al héroe si el campo está vacío. Combo Progenitores: +1 de daño.',
    lore: 'El primer rayo no pide permiso a la oscuridad. La atraviesa.',
  },
  {
    id: 'c10', name: 'Pacto de Xibalbá', faction: 'Xibalbá', type: 'spell',
    cost: 2, fd: 0, pc: 0, as: 0, hp: 0, rarity: 'rare',
    keyword: 'Hechizo', ability: 'Secretos prohibidos', art: 3, tone: 'violet',
    description: 'Roba dos cartas. Combo Xibalbá: recupera 1 maíz si controlas una criatura de Xibalbá.',
    lore: 'Hasta las sombras negocian. El precio de sus secretos solo se descubre cuando ya es demasiado tarde.',
  },
].map((card) => Object.freeze(card)))

export const CARD_BY_ID = Object.freeze(Object.fromEntries(CARDS.map((card) => [card.id, card])))
