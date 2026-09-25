---
description: Crea un git worktree local en `.worktrees/<nombre>` con `git worktree add`.
agent: build
---

Recibes el argumento del usuario: `$ARGUMENTS`

Tu única tarea es crear un worktree de git de forma local.

1. Deriva el NOMBRE del worktree a partir del argumento:
   - Normaliza el argumento a minúsculas y reemplaza espacios y caracteres no alfanuméricos por guiones `-`.
   - Ejemplo: `implementar el HUD` -> `implementar-el-hud`.
   - Si no hay argumento, genera un nombre corto basado en el contexto actual (rama activa o trabajo en curso).
2. Determina la raíz del repositorio con `git rev-parse --show-toplevel`.
3. Ejecuta ÚNICAMENTE el siguiente comando (sin cambiarte de directorio):

   `git -C <RAIZ> worktree add .worktrees/<NOMBRE>`

4. si el argumento es muy largo, simplificalo.

No hagas nada más: no cambies de directorio, no ejecutes otros comandos, no modifiques archivos. Confirma brevemente el nombre del worktree creado.