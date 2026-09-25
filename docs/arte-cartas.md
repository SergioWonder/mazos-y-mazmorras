# Guía de estilo: arte de las cartas

Cada carta tiene una ilustración SVG dibujada a mano en `src/arte/cartas/<id>.svg`. Las
cartas **full art** (las cinco únicas de clase, *Seducir* y *Deseo*) tienen además una
versión vertical en `src/arte/cartas/full/<id>.svg`. El juego las carga como `<img>`.
Referencias de estilo: `src/arte/cartas/golpe.svg` y `src/arte/cartas/defender.svg`.

## Formato (obligatorio)

- Carta normal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 160" width="280" height="160">`.
- Full art: `viewBox="0 0 296 423" width="296" height="423"`.
- Autocontenido: sin `<text>`, sin `<image>`, sin `<script>`, sin fuentes ni enlaces
  externos. Los `id` de `<defs>` pueden repetirse entre archivos (cada imagen es un
  documento aparte).
- Tamaño: hasta 14 KB por carta normal y 28 KB por full art. Usa curvas (`Q`, `C`) en
  vez de cientos de puntos, y redondea las coordenadas a 1 decimal como mucho.
- XML válido (se comprueba en `scripts/smoke-test.ts`).

## Encuadre

- La carta muestra la ilustración recortada al centro, a unos 124×56 px
  (`object-fit: cover`): **lo importante tiene que caber en la franja central 280×110**
  (y de 25 a 135), y leerse a ese tamaño. Siluetas claras, poco detalle diminuto.
- Full art: la mitad inferior queda tapada en parte por el panel de texto; **el motivo
  principal va en el 60 % superior**. La parte baja lleva ambiente (suelo, niebla,
  brillos) y algún detalle secundario.

## Estilo «ilustrado» (el de los monstruos del juego)

- **Contorno de tinta** `#140d0a` grueso (2–3 px) alrededor de cada figura, y líneas
  interiores finas (0,8–1,2 px) para pliegues, músculos, placas o grietas.
- **Sombra recortada**: cada volumen tiene una forma más oscura del mismo tono en el
  lado contrario a la luz (la luz viene de **arriba a la izquierda**), y alguna luz clara
  en el borde iluminado. Nada de degradados suaves en las figuras: planos de color.
- **Paletas apagadas y serias**: nada de colores saturados de dibujo infantil, salvo en
  la magia, el fuego y los ojos, que **brillan** (usa
  `<filter><feGaussianBlur stdDeviation="2–4"/></filter>` en una copia difuminada
  debajo del trazo nítido).
- **Fondo pintado**: degradado de cielo o interior con el color de la clase, un
  **escenario reconocible** en siluetas más oscuras (bosque, campo de batalla, biblioteca
  arcana, tejados, ruinas del vacío, cripta, guarida del dragón…), un halo de luz detrás
  del motivo y una **viñeta** oscura en los bordes (`radialGradient` a negro). Varía el
  escenario entre cartas.

### Colores de fondo por clase

| Clase | Cielo arriba → abajo | Brillo |
|---|---|---|
| Druida | `#34502c` → `#131f11` | `#a8e070` |
| Bárbaro | `#5e2a1a` → `#210d07` | `#ff9a50` |
| Mago | `#2e2c60` → `#0f0f2c` | `#a896ff` |
| Pícaro | `#1f3c3a` → `#0b1918` | `#72e0cc` |
| Brujo | `#381c50` → `#11071c` | `#c98bff` |
| Neutral / básicas | `#4c4436` → `#1c1812` | `#ffe0a0` |

## Personajes y monstruos

- **El héroe es anónimo**: siempre como **silueta a contraluz**, casi negra (`#0b0910`),
  con una **luz de borde** del color de la clase (una copia de la silueta desplazada
  1–1,5 px hacia arriba a la derecha y pintada con el brillo, detrás de la silueta) y, como
  mucho, ojos o magia brillando. Nunca se le ve la cara. Sale cuando la carta es una
  acción suya (golpear, esquivar, conjurar, gritar…). También puede aparecer solo una
  mano, un brazo o la espalda.
- Siluetas de clase: druida con capucha y astas y bastón; bárbaro corpulento con melena
  y hacha; mago con sombrero puntiagudo, túnica y bastón con orbe; pícaro encapuchado,
  ágil, con dagas; brujo con cuernos, capa de cuello alto y llama violeta en la mano.
- **Formas del druida** (lobo, oso, águila, enjambre, lobo lunar, ciervo estelar): también
  son siluetas a contraluz, con borde verde.
- **Monstruos e invocaciones**, en estilo ilustrado a todo color: goblins verdes de orejas
  enormes, esqueletos con cuencas azules, zombis, espectros, kobolds, cultistas
  encapuchados, dracos granate, demonios, azotamentes, contempladores… y las
  invocaciones: lobo gris, oso pardo, elementales de fuego, agua, aire y tierra, espíritu
  del bosque, sabueso violeta del vacío y demonio pactado. Que sean **víctimas u
  objetivos** de la carta cuando tenga sentido (el goblin que recibe el tajo, el esqueleto
  al que atrapan las raíces…).

## Variedad

Dentro de un mismo mazo **no repitas composición ni encuadre**. Alterna plano general y
primer plano, vista lateral y en picado, día y noche, interior y exterior, y cambia el
color de acento. El símbolo de la carta (llama, runa, daga…) puede aparecer, pero
integrado en una escena, no flotando solo en el centro.
