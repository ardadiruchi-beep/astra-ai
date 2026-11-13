# Declaración de uso de IA, límites y seguridad

## Uso de IA (transparencia)

- El MCP se construyó con el **mcp-starter-kit (branch main)** y su Constructor:
  la IA (opencode) redactó el código de las herramientas a partir del encargo
  registrado en [`PROMPT.md`](PROMPT.md), siguiendo las reglas de
  [`AGENTS.md`](AGENTS.md).
- La investigación de vías de integración ([`INVESTIGACION.md`](INVESTIGACION.md))
  y las pruebas (`npm run build`, `npm test`, pruebas manuales contra la app
  real) fueron revisadas por el autor.
- En operación, las respuestas que lee el MCP **son generadas por Astra AI**;
  el MCP solo automatiza la interfaz y lee la pantalla por OCR.

## Aplicación de terceros

- Astra AI (`com.astra-ai.app`) es una app propietaria de un tercero. Este MCP
  **no extrae su código, no accede a sus servidores ni la modifica**: solo
  automatiza su interfaz como lo haría un usuario (teclado, clics, lectura de
  pantalla). No se usó ingeniería inversa (el branch `pro-rea` del kit no se
  empleó).

## Permisos acotados

- **Accesibilidad**: solo para escribir/pegar texto y hacer clic en la ventana
  de Astra.
- **Grabación de pantalla**: solo para capturar la ventana de Astra y leerla
  por OCR. Las capturas se guardan en `data/capturas/` (excluida de git).
- No se solicitan ni guardan credenciales, tokens ni datos personales. No hay
  secretos en el código ni variables de entorno requeridas.

## Límites conocidos

- La lectura de la interfaz depende del OCR y del foco del campo de texto.
- Las acciones de envío (`astra_preguntar`) y de clic (`astra_clic`) exigen
  confirmación explícita (`confirmar: true`).
- macOS exige conceder los permisos manualmente (una sola vez).
- La ventana de apps iOS puede cambiar de id entre sesiones; el helper la
  redescubre automáticamente.

## Consideraciones de seguridad

- Entradas validadas con `zod`; los programas se ejecutan con `execFile` y
  argumentos (sin shell): no hay inyección de comandos.
- El OCR lee lo visible en pantalla: si la ventana muestra datos sensibles, la
  captura local los incluirá (por eso `data/` no se publica ni se versiona).
- Se recomienda usar la app sin información personal visible mientras se
  automatiza, y cerrar sesión en Astra al terminar si el equipo es compartido.
