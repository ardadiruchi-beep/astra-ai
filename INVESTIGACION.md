# Investigación: control de Astra AI desde un MCP

## Aplicación

- App: Astra AI (bundle `com.astra-ai.app`, proceso `AstraAI`)
- Tipo: binario iOS "Designed for iPad" ejecutado en macOS.
- Ruta: `/Applications/Astra AI.app`

## Vías probadas (de más a menos robusta)

1. **API HTTP / WebSocket / plugin oficial**: no existe. No expone ningún servidor local.
2. **CLI de la app**: no existe. `Contents/MacOS` no ofrece comandos útiles y `--help` no aplica.
3. **Archivos de datos**: no hay datos útiles en disco que representen el chat o la UI.
4. **Scripting del sistema (AppleScript/JXA)**: la app NO es "scriptable" (`sdef` no devuelve diccionario). `System Events` devuelve `missing value` al leer la UI, por lo que **no se puede leer la interfaz con AppleScript**. Sí funcionan: `open -a "Astra AI"`, `keystroke`, `click at {x,y}`.
5. **Automatización de interfaz + OCR**: vía elegida. Técnicas que sí funcionan:
   - `open -a "Astra AI"` (abrir/activar).
   - `osascript` System Events `keystroke`.
   - Pegar con `pbcopy` + `keystroke "v" using command down`.
   - Clic con `click at {x,y}`.
   - Captura con `screencapture -x` recortada a los límites de la ventana (screencapture `-l <id>` no captura el contenido de apps iOS).
   - OCR con el framework Vision de macOS desde un helper Swift compilado (`helper/astra-helper.swift`), que también obtiene el id y los límites de la ventana (`CGWindowList`) y los permisos (`AXIsProcessTrusted`, `CGPreflightScreenCaptureAccess`).

## Vía elegida

Automatización de interfaz + OCR, porque es la única que permite abrir la app, escribir preguntas, enviarlas y leer las respuestas.

## Alternativas descartadas

- AppleScript para leer la UI: devuelve `missing value` (app no expone accesibilidad).
- `screencapture -l <windowId>`: captura vacía para apps iOS; se reemplazó por captura de pantalla completa recortada a los límites de la ventana.
- API/CLI/archivos: no existen.

## Limitaciones conocidas

- La lectura depende del OCR y del foco del campo de texto: si el campo no está enfocado, `astra_escribir`/`astra_preguntar` pegan en el elemento que tenga el foco.
- Requiere permisos de Accesibilidad (para clics y teclas) y Grabación de pantalla (para capturas).
- El OCR puede tener errores en texto pequeño o de bajo contraste.
- Las coordenadas de `astra_clic` y `clic_previo` son normalizadas (0-1) dentro de la ventana.
- No se puede leer la UI estructurada; solo texto vía OCR.
- Las ventanas de apps iOS pueden cambiar de id entre sesiones; el helper las redescubre dinámicamente.