---
name: editar-carta
description: "Aplica cambios de efecto/equilibrio a cartas de Mazo y Mazmorra a partir del JSON de comentarios que exporta el Compendio (lista de {id, comentario}). Localiza cada carta por su id en src/core/cartas.ts e implementa lo que pide el comentario. Úsalo cuando el usuario pegue un JSON de comentarios de cartas o pida 'aplica estos comentarios', 'cambia estas cartas', 'edita la carta X según el comentario'."
trigger: /editar-carta
---

# /editar-carta — aplicar comentarios del Compendio a las cartas

El Compendio del juego (menú → 📖 Compendio) exporta los comentarios marcados como
JSON. Este skill toma ese JSON y aplica cada cambio a la carta correspondiente.

## Entrada

Un JSON (pegado por el usuario o pasado como argumento) con forma:

```json
[
  { "id": "enredadera", "comentario": "sube el daño extra a 10 y baja el coste a 0" },
  { "id": "postura-firme", "comentario": "que el bloqueo base sea 9" }
]
```

También acepta un único objeto `{ "id": "...", "comentario": "..." }`.

## Pasos

1. **Parsea el JSON.** Si no es válido, pídelo de nuevo. Normaliza a una lista de
   `{id, comentario}`.

2. **Para cada entrada**, localiza la carta en `src/core/cartas.ts` buscando
   `id: '<id>'`. Si no existe, avísalo y sigue con las demás (no inventes la carta).
   Los ids están en `BASICAS`, `DRUIDA`, `BARBARO` y `MAGO`.

3. **Interpreta el comentario** (lenguaje natural) y aplícalo editando la carta.
   Respeta SIEMPRE las convenciones del fichero:
   - Mantén `texto` coherente con el efecto real (los números del texto deben
     coincidir con los de `jugar`). El texto admite saltos `\n`.
   - El formateador de texto resalta «Inflige N» y «Gana N de bloqueo»; úsalos cuando
     apliquen para que el número se muestre en vivo con los modificadores.
   - Si la carta tiene `mejora`, ajústala de forma análoga (suele ser una versión
     más potente o más barata). Si el comentario solo habla de la base, escala la
     mejora con criterio y dilo en el resumen.
   - Usa la API de `ContextoEfecto` (`c.atacar`, `c.ganarBloqueo`, `c.aplicarEstado`,
     `c.curar`, `c.ganarFuria`, `c.gastarConjuro`, `c.recuperarConjuro`, etc.); no
     accedas a internals salvo que ya se haga así en cartas similares.
   - Estados válidos: ver `EstadoId` en `src/core/types.ts`.

4. **Verifica** que todo compila y los tests pasan:
   ```
   npx tsc --noEmit
   npm run build
   npx tsx scripts/smoke-test.ts
   ```
   Si un test se vuelve obsoleto por el cambio, actualízalo en `scripts/smoke-test.ts`.

5. **Resume** qué cambió en cada carta (valores antes → después). NO subas versión ni
   hagas commit salvo que el usuario lo pida (para publicar, usa `/release`).

## Notas

- Si un comentario es ambiguo (p. ej. «equilibrar esto»), elige una interpretación
  razonable, aplícala y explica el criterio; no te detengas a preguntar salvo que
  el cambio sea arriesgado o contradictorio.
- Cambios de coste/daño/bloqueo/estados son seguros; si un comentario pide una
  mecánica nueva inexistente, impleméntala mínimamente o indícalo como pendiente.
