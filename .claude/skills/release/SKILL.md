---
name: release
description: "Publica una nueva versión de Mazo y Mazmorra: sube la versión (semver), añade una entrada al registro de cambios que alimenta la ventana de novedades del juego, verifica el build y hace commit + push a main para desplegar en GitHub Pages. Úsalo siempre que el usuario quiera 'publicar', 'sacar versión', 'hacer release', 'subir versión' o 'push con novedades'."
trigger: /release
---

# /release — publicar versión con ventana de novedades

Automatiza el flujo de release de este proyecto: **subir versión + añadir las
novedades + verificar + commit & push a `main`** (lo que dispara el despliegue en
GitHub Pages vía `.github/workflows/deploy.yml`).

La ventana de novedades del juego se alimenta de `CHANGELOG` en `src/version.ts`
(la lógica vive en `src/ui/actualizacion.ts`). Subir `VERSION` es lo que hace que
a los jugadores les salte el aviso de actualización y la ventanita de cambios tras
recargar la PWA.

## Uso

```
/release                      # infiere los cambios desde git y pregunta el tipo de salto
/release patch                # fuerza salto de parche (0.2.0 → 0.2.1)
/release minor                # fuerza salto menor  (0.2.0 → 0.3.0)
/release major                # fuerza salto mayor  (0.2.0 → 1.0.0)
/release minor "texto extra"  # añade contexto para redactar las viñetas
```

## Pasos (ejecútalos en orden)

1. **Lee el estado actual.**
   - `VERSION` en `src/version.ts`.
   - `version` en `package.json` (deben coincidir; si no, avísalo).
   - `git log <ultimo-tag-o-commit-de-release>..HEAD --oneline` y `git status` para
     ver qué ha cambiado desde la última versión. Si hay cambios sin commitear,
     inclúyelos en este release (no hagas un release con el árbol sucio sin avisar).

2. **Redacta las novedades.** A partir de los commits/diff desde la última versión,
   escribe de 2 a 6 viñetas **en español, orientadas al jugador** (no técnicas),
   cada una empezando por un emoji, imitando el estilo de las entradas existentes
   en `CHANGELOG`. Ejemplo:
   `'🔥 Frenesí: cuesta 1 y duplica tu Furia, pero se rompe al final del turno.'`
   Si el argumento incluye texto libre, úsalo como guía.

3. **Decide la versión nueva (semver).**
   - Si el usuario pasó `patch`/`minor`/`major`, úsalo.
   - Si no, propón el salto según los cambios (correcciones → patch; cartas/funciones
     nuevas → minor; cambios que rompen guardados o el flujo → major) y **confírmalo
     con el usuario** con AskUserQuestion antes de continuar.

4. **Obtén la fecha de hoy** (campo `currentDate` del contexto, o `date +%F`) en
   formato `AAAA-MM-DD` para la entrada del changelog.

5. **Edita `src/version.ts`:**
   - Cambia `export const VERSION = '<nueva>'`.
   - Inserta una nueva `EntradaCambios` **al principio** del array `CHANGELOG`
     (orden: más reciente primero) con `{ version, fecha, cambios: [...] }`.

6. **Edita `package.json`:** pon `"version": "<nueva>"` (debe coincidir con `VERSION`).

7. **Verifica** que todo compila y los tests pasan:
   ```
   npx tsc --noEmit
   npm run build
   npx tsx scripts/smoke-test.ts
   ```
   Si algo falla, **detente** y corrige antes de hacer push.

8. **Actualiza artefactos del proyecto** si los cambios lo requieren (instrucciones
   de la organización): mantén `README.md`, el grafo de `graphify-out/` (si existe) y
   `docs/database-schema.dbml` (si existe y tocaste el esquema). Si no existen, omítelo.

9. **Commit & push a `main`:**
   ```
   git add -A
   git commit -F - <<'EOF'
   <título: resumen del release en una línea>

   <viñetas del changelog>

   Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
   EOF
   git push origin main
   ```

10. **Reporta** la versión publicada y comprueba el workflow con
    `gh run list --branch main --limit 1`. Ofrece vigilar el despliegue.

## Notas

- `main` es la rama de despliegue: el push a `main` es intencional aquí (no crees una
  rama aparte; GitHub Pages se publica desde `main`).
- `dist/` está en `.gitignore`; lo construye el workflow, no lo commitees.
- El banner de "Nueva versión disponible" solo aparece a partir del **siguiente**
  despliegue respecto al que introdujo el modo `prompt` de la PWA.
