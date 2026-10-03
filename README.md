# Popol Vuh · El despertar de los dioses

Juego de cartas local inspirado en los personajes del Popol Vuh. React 19 + Vite.

## Ejecutar

```sh
npm install
npm run dev
```

Abre la dirección que muestra Vite. El juego comienza con un duelo contra la IA. Desde **Nuevo duelo** puedes elegir dos jugadores en el mismo dispositivo y activar la Cosecha de Paxil antes del combate.

## Combate

- Cada héroe tiene 30 de vida. Ambos comienzan con un guardián y cinco cartas.
- El maíz es energía: comienza en 3 y aumenta hasta 10; se restaura al iniciar cada turno propio.
- Puedes jugar varias cartas mientras tengas energía. Máximo cinco criaturas y ocho cartas en mano.
- Las criaturas recién invocadas esperan un turno, salvo las que tienen **Prisa**.
- Selecciona una criatura lista, elige **Fuerza**, **Magia** o **Astucia** y pulsa un objetivo. Cada criatura ataca una vez por turno.
- El daño es `max(1, ceil(poder atacante / 2) - floor(poder defensor / 4))`. El defensor contraataca simultáneamente con el mismo atributo. El daño a héroes es `ceil(poder / 2)`.
- **Guardia** protege los demás objetivos. Las habilidades, combos de facción y hechizos se detallan al examinar cada carta.
- Robar con la mano llena descarta la carta. Robar de un mazo vacío causa fatiga creciente.

## Interacción

Selecciona una carta de tu mano y usa **Invocar**, pulsa un altar vacío o arrástrala a tu terreno. El ojo de cada carta (o clic derecho) abre una vista ampliada con su habilidad e historia. **Colección** permite buscar y filtrar los diez diseños.

Teclas **1 / 2 / 3**: cambiar atributo al atacar. **Esc**: cancelar selección o cerrar un diálogo. Sonido y movimiento reducido se configuran en Ajustes y se conservan en el navegador. El modo local oculta la mano al cambiar de jugador.

## Verificación

```sh
npm run lint
npm test
npm run build
```

Las pruebas cubren legalidad de acciones, combate, combos, Prisa, Guardia, Drenaje, fatiga, límites e inmutabilidad, y simulan partidas completas entre dos IA.

## Arte

Las ocho ilustraciones y la arena son originales, generadas con la herramienta integrada de imágenes. El juego usa archivos WebP optimizados en `public/art`; los originales se conservan en `src/assets/art-source`. Prompts y mapa del atlas: [public/art/ART_DIRECTION.md](public/art/ART_DIRECTION.md).
