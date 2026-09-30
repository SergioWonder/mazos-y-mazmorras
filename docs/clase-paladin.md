# Clase: Paladín

Sexta clase de Dracs & Rogues. Id interno `paladin`, nombre «Paladín», emoji 🔨.
Guerrero sagrado con **martillo** y escudo: mucha vida, mucho bloqueo, Castigos que
supervitaminan su siguiente ataque y Fervor que se carga jugando Golpes y Defensas.

- **PV iniciales:** 76 (el bárbaro tiene 80).
- **Colores:** luz dorada del amanecer. Tinte `--paladin: #ffd35a`, oscuro `#5a4410`.
  Fondo de cartas: cielo `#5c4a1c` → `#1b1409`, brillo `#ffd35a`. Luz de borde del héroe
  `#ffd35a`.
- **Mazo inicial:** 5 Golpe + 4 Defender + Castigo Divino + Escudo de la Fe.
- **Reliquia inicial:** Símbolo Sagrado.

## Mecánicas

### Fervor (estado `fervor`, del jugador)
- Cada **Golpe** (`golpe`, `golpe-sagrado`) o **Defensa** (`defender`, `defensa-sagrada`)
  que juega el paladín le da **1 de Fervor**. Algunas cartas dan Fervor directamente.
- Se acumula durante el combate. Los **Castigos** lo consumen entero para potenciarse.
- Solo existe para el paladín.

### Castigos
- Cartas de habilidad que **preparan** un efecto sobre el **siguiente ataque** que juegues
  (la siguiente carta de tipo ataque). Al jugarlas consumen tu Fervor y fijan su potencia.
- **Solo uno a la vez**: con un Castigo preparado no se puede jugar otra carta de Castigo. Los
  efectos que generan Castigo (Ángel Vengador) refuerzan el que ya haya.
- Mientras está preparado, el héroe arde con un aura sagrada de llamas amarillas y blancas, y una
  ficha junto a él muestra lo que llevará el próximo ataque.
- Al descargarse: se aplica **una sola vez**, en el primer golpe del ataque (en un ataque de área,
  solo sobre el primer objetivo; la llamarada del Abrasador sigue alcanzando a todos, una vez).
- Indicador: estado `castigo` (1 si hay uno preparado) y ficha `castigo-ficha` junto al héroe.
- Elementos (cada uno con su efecto visual al preparar y al descargar):

| Castigo | Elemento | Efecto al descargar |
|---|---|---|
| Castigo Divino | divino (luz dorada) | +daño |
| Castigo Atronador | trueno (rayo azul-blanco) | aplica Vulnerable |
| Castigo Cegador | luz cegadora (blanco) | aplica Débil |
| Castigo Abrasador | fuego (llama dorada-naranja) | daño extra a TODOS los enemigos |
| Castigo Resplandeciente | resplandor (oro suave) | +daño y bloqueo igual al daño hecho |
| Castigo Desterrador | destierro (sello de luz, violeta-oro) | destierra (mata) si queda con pocos PV |

### Golpes y Defensas sagrados
- `golpe-sagrado`: 1 energía, inflige 14 (20 mejorado). Cuenta como Golpe.
- `defensa-sagrada`: 1 energía, gana 11 de bloqueo (16 mejorada). Cuenta como Defensa.
- No salen en recompensas: solo por la reliquia inicial (al **eliminar** un Golpe o un
  Defender del mazo, en la taberna o en eventos, se convierte en su versión sagrada y
  conserva la mejora).

## Cartas

Formato: `id` — Nombre — tipo, rareza, coste — texto (mejora) — clave fx — ilustración.

### Iniciales
1. `castigo-divino` — Castigo Divino — habilidad, inicial, 1 — Castigo: tu siguiente ataque
   inflige 6 de daño más (aplica +2 por cada Fervor). Consume tu Fervor. (9, +3 por Fervor)
   — fx `cargaDivina` / descarga `castigoDivino` — El martillo del paladín envuelto en luz
   dorada cae sobre un demonio encogido.
2. `escudo-fe` — Escudo de la Fe — habilidad, inicial, 1 — Gana 5 de bloqueo (aplica +2 por
   Fervor gastado): la salida defensiva del Fervor. (7, +3) — fx `escudoSagrado` — El paladín alza el escudo; un sello de luz lo cubre y
   las flechas rebotan.

### Comunes
3. `castigo-atronador` — Castigo Atronador — habilidad, común, 1 — Castigo: tu siguiente
   ataque aplica 2 de Vulnerable (aplica +1 por cada 2 de Fervor). Consume tu Fervor. (3)
   — `cargaTrueno` / `castigoTrueno` — Martillo cargado de relámpagos; una onda de trueno
   derriba a un gnoll.
4. `castigo-cegador` — Castigo Cegador — habilidad, común, 1 — Castigo: tu siguiente ataque
   aplica 2 de Débil (aplica +1 por cada 2 de Fervor). Consume tu Fervor. (3)
   — `cargaCegadora` / `castigoCegador` — Un destello blanco estalla del martillo; un kobold
   se tapa los ojos.
5. `castigo-abrasador` — Castigo Abrasador — habilidad, común, 1 — Castigo: tu siguiente
   ataque inflige además 4 de daño a TODOS los enemigos (aplica +2 por cada Fervor).
   Consume tu Fervor. (6, +3 por Fervor) — `cargaFuego` / `castigoFuego` — Martillo en llamas
   doradas; un anillo de fuego sobre una fila de esqueletos.
6. `martillo-luz` — Martillo de Luz — ataque, común, 1 — Inflige 7 de daño. Castigo: tu
   próximo ataque inflige 4 de daño más (no gasta Fervor). (10, 6) — `martillo` — Un martillo espectral de luz amarilla cae del cielo sobre un
   orco.
7. `embate-escudo` — Embate de Escudo — ataque, común, 1 — Inflige daño igual a tu bloqueo.
   (coste 0) — `martillo` — El paladín carga con el escudo por delante contra un ogro.
8. `guardia-sagrada` — Guardia Sagrada — habilidad, común, 1 — Gana 8 de bloqueo. Si tienes
   un Castigo preparado, gana 4 más. (11, +5) — `escudoSagrado` — Paladín arrodillado tras el
   escudo, el martillo brillando a su lado.
9. `instruccion-armas` — Instrucción de Armas — habilidad, común, 0 — Roba 1 Golpe y 1
   Defensa de tu mazo. (…y gana 1 de Fervor) — `bendicion` — Patio de armas al alba: un
   muñeco de entrenamiento con escudo y un martillo clavado en el suelo.
10. `plegaria-alba` — Plegaria del Alba — habilidad, común, 1 — Gana 2 de Fervor. Roba 1
    carta. (3 de Fervor) — `bendicion` — El paladín reza ante un altar mientras amanece y
    los rayos entran por un ventanal.
11. `carga-sagrada` — Carga Sagrada — ataque, común, 2 — Inflige 12 de daño. Gana 6 de
    bloqueo. (16, 8) — `martillo` — El paladín a la carrera, martillo en alto, estela dorada.

### Infrecuentes
12. `castigo-desterrador` — Castigo Desterrador — habilidad, infrecuente, 2 — Castigo: si tu
    siguiente ataque deja al enemigo con 12 PV o menos (aplica +3 por cada Fervor), lo
    destierra. Contra jefes, inflige esa cantidad de daño más. Consume tu Fervor. (16, +4)
    — `cargaDestierro` / `castigoDestierro` — Un sello circular de luz se abre bajo un
    espectro y lo arrastra fuera del mundo.
13. `castigo-resplandeciente` — Castigo Resplandeciente — habilidad, infrecuente, 1 —
    Castigo: tu siguiente ataque inflige 4 de daño más (aplica +1 por cada Fervor) y ganas
    bloqueo igual al daño que haga. Consume tu Fervor. (coste 0) — `cargaResplandor` /
    `castigoResplandor` — Martillo radiante; al impactar, un escudo de luz se forma ante el
    paladín.
14. `expulsar-mal` — Expulsar el Mal — ataque, infrecuente, 2 — Inflige 10 de daño a TODOS
    los enemigos y les aplica 1 de Débil. (14, 2) — `expulsar` — El paladín alza su símbolo
    sagrado; una onda de luz empuja a una horda de no-muertos.
15. `palabra-radiante` — Palabra Radiante — ataque, infrecuente, 1 — Inflige 5 de daño a
    TODOS los enemigos. Gana 1 de Fervor por cada enemigo golpeado. (7) — `rayoSagrado` —
    Rayos sagrados caen del cielo sobre un grupo de cultistas.
16. `bastion-fe` — Bastión de Fe — poder, infrecuente, 2 — Poder: al inicio de tu turno
    conservas hasta 10 de tu bloqueo. (coste 1) — `escudoSagrado` — Una muralla con un escudo
    gigante de luz encajado en la puerta.
17. `arma-consagrada` — Arma Consagrada — poder, infrecuente, 1 — Poder: tus Golpes infligen
    3 de daño más. (5) — `bendicion` — Un martillo sobre un altar recibe un haz de luz.
18. `egida-divina` — Égida Divina — poder, infrecuente, 1 — Poder: tus Defensas dan 3 de
    bloqueo más. (5) — `escudoSagrado` — Un escudo con alas de luz desplegadas.
19. `celo-inquebrantable` — Celo Inquebrantable — poder, infrecuente, 1 — Poder: al inicio
    de cada turno ganas 1 de Fervor. (Innata) — `bendicion` — Una llama votiva dorada arde en
    el pecho de la silueta del paladín.
20. `imposicion-manos` — Imposición de Manos — habilidad, infrecuente, 1 — Te curas 6 PV
    (aplica +2 por cada Fervor). Consume tu Fervor. Se agota. (9, +3) — `bendicion` — Manos
    que brillan sobre la herida de un compañero caído.
21. `martillo-juicio` — Martillo del Juicio — ataque, infrecuente, 2 — Inflige 14 de daño.
    El Castigo que descargue se aplica dos veces. (18) — `martillo` — Un martillo
    colosal de luz golpea el suelo y lo agrieta en líneas doradas.
22. `voz-autoridad` — Voz de Autoridad — habilidad, infrecuente, 1 — Gana 6 de bloqueo.
    Aplica 1 de Débil a TODOS los enemigos. (9, 2) — `expulsar` — El paladín grita con el
    martillo en alto y los enemigos retroceden.
23. `muro-fe` — Muro de Fe — habilidad, infrecuente, 1 — Gana 4 de bloqueo por cada Golpe y
    Defensa en tu mano. (5) — `escudoSagrado` — Un muro de escudos dorados en formación.
24. `voto-hierro` — Voto de Hierro — habilidad, infrecuente, 0 — Gana 1 de Fervor por cada
    Golpe y Defensa en tu mano. Se agota. (ya no se agota) — `bendicion` — Una mano con
    guantelete sobre el mango del martillo, jurando.

### Raras (juramentos de D&D 2024 y un gran hechizo)
25. `juramento-devocion` — Juramento de Devoción — poder, rara, 2 — Poder: tus ataques
    infligen daño adicional igual a tu Fervor (sin consumirlo). (coste 1) — secuencia propia
    — El paladín con el arma sagrada envuelta en luz y un aura blanca.
26. `juramento-gloria` — Juramento de Gloria — poder, rara, 1 — Poder: cada vez que
    descargas un Castigo, ganas 1 de Fuerza. (…y 1 de Fervor) — secuencia propia — Paladín
    triunfante en lo alto de una escalinata, laureles de luz.
27. `juramento-antiguos` — Juramento de los Antiguos — poder, rara, 2 — Poder: al final de
    tu turno ganas 1 de bloqueo por cada Fervor. (coste 1) — secuencia propia — Paladín en un
    bosque antiguo, enredaderas doradas y aura verde-oro.
28. `juramento-venganza` — Juramento de Venganza — poder, rara, 1 — Poder: tus Castigos
    cuestan 0. (Innata) — secuencia propia — Paladín encapuchado de ojos ardientes que
    señala con el martillo a un enemigo marcado.
29. `colera-celestial` — Cólera Celestial — ataque, rara, 3 — Inflige 7 de daño a TODOS los
    enemigos 2 veces. (3 veces) — secuencia propia — Columnas de luz caen del cielo sobre un
    ejército enemigo.

### Única de clase (Acto III, full art)
30. `angel-vengador` — Ángel Vengador — poder, especial, 2 — Poder: al inicio de cada turno
    preparas un Castigo de 8 de daño más; si ya tienes uno, le suma 8. (Innata; 10) — secuencia
    propia — **Full art**: el paladín con enormes alas de luz, martillo alzado, suspendido
    sobre un campo de batalla.

### Generadas (reliquia inicial)
31. `golpe-sagrado` — Golpe Sagrado — ataque, especial, 1 — Inflige 14 de daño. (20)
    — `martillo` — Como el Golpe básico, pero el arma es un martillo de luz dorada.
32. `defensa-sagrada` — Defensa Sagrada — habilidad, especial, 1 — Gana 11 de bloqueo. (16)
    — `escudoSagrado` — Como el Defender básico, pero el escudo irradia luz sagrada.

## Reliquias

- `simbolo-sagrado` — Símbolo Sagrado (inicial) — Cuando eliminas un Golpe de tu mazo, se
  convierte en Golpe Sagrado; si eliminas un Defender, en Defensa Sagrada. — Un medallón
  dorado con un martillo y un sol.
- `guantelete-cruzado` — Guantelete del Cruzado (común) — Empiezas cada combate con 2 de
  Fervor. — Guantelete de placas con un sol grabado.
- `rosario-plata` — Rosario de Plata (común) — Tu primer Golpe o Defensa de cada turno te da
  1 de Fervor más. — Rosario de cuentas plateadas con un colgante de martillo.
- `estandarte-sagrado` — Estandarte Sagrado (rara) — Cada vez que descargas un Castigo,
  ganas 4 de bloqueo. — Estandarte blanco y oro en un asta.
- `yelmo-juramento` — Yelmo del Juramento (rara) — Cada vez que juegas tu 3.er Golpe o
  Defensa del turno, robas 1 carta. — Yelmo cerrado con alas en los laterales.
- Bendiciones de clase: `bendicion-martillo-radiante` (tus Golpes infligen 2 más y tus
  Defensas dan 2 de bloqueo más; un martillo rodeado de rayos) y `bendicion-aurora`
  (empiezas cada combate con un Castigo de 8 de daño preparado; un sol naciente tras un
  escudo). Don de la carta única: `don-angel-vengador` (al jugar Ángel Vengador ganas 3 de
  Fervor; una pluma de luz).

## Claves de efectos (fx)

Todas se dibujan sobre el receptor indicado:

| Clave | Receptor | Cuándo |
|---|---|---|
| `martillo` | objetivo | golpes de martillo del paladín (Golpe Sagrado, Martillo de Luz…) |
| `escudoSagrado` | héroe | bloqueo de sus cartas de defensa |
| `bendicion` | héroe | ganar Fervor, poderes de bendición, curas |
| `expulsar` | cada enemigo | onda de luz de área (Expulsar el Mal, Voz de Autoridad) |
| `rayoSagrado` | cada enemigo | rayo sagrado desde el cielo (Palabra Radiante) |
| `cargaDivina`, `cargaTrueno`, `cargaCegadora`, `cargaFuego`, `cargaResplandor`, `cargaDestierro` | héroe | al preparar cada Castigo (el martillo se carga del elemento) |
| `castigoDivino`, `castigoTrueno`, `castigoCegador`, `castigoFuego`, `castigoResplandor`, `castigoDestierro` | objetivo | al descargarse sobre el enemigo, en el impacto del ataque |
| `muertePaladin` | héroe | muerte del paladín (`fx/hero-death.ts`) |

Las raras y la única llevan secuencia propia en `CARD_FX` (`fx/card-spells.ts`).
