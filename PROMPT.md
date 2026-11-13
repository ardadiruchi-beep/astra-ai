# Mision

Construye un servidor **MCP** (Model Context Protocol) en TypeScript que permita a un asistente de IA controlar la aplicacion **Astra AI** instalada en el computador del usuario.

| Dato | Valor |
|---|---|
| Aplicacion | Astra AI |
| Sistema operativo | macOS |
| Ubicacion / identificador | /Applications/Astra AI.app |
| Nombre del servidor MCP | astra-ai |
| Lo que el usuario quiere hacer | Controlar la app iOS "Astra AI" (/Applications/Astra AI.app, bundle com.astra-ai.app, proceso "AstraAI") en macOS para usarla: escribir preguntas, leer las respuestas de la IA y navegar su interfaz.

HALLAZGOS YA VERIFICADOS (no los repitas): no tiene CLI, API local ni datos utiles en disco. VIA ELEGIDA: automatizacion de interfaz + OCR. Es un binario iOS que NO expone accesibilidad (System Events da missing value): no leer la UI con AppleScript. Tecnicas que SI funcionan: open -a "Astra AI" (abrir/activar); osascript System Events "keystroke"; pegar con pbcopy + keystroke "v" using command down; clic con "click at {x,y}"; captura con screencapture -x + recorte; OCR con el framework Vision de macOS desde un helper Swift compilado con swiftc (helper/astra-helper.swift), que tambien obtiene id y limites de ventana (CGWindowList) y el permiso de Accesibilidad (AXIsProcessTrusted). El OCR devuelve texto por lineas, de arriba a abajo.

HERRAMIENTAS (6, snake_case, annotations):
1. astra_estado (solo lectura): app abierta? ventana y permisos de Accesibilidad y Grabacion de pantalla.
2. astra_abrir: abre y trae al frente la app.
3. astra_ver (solo lectura): captura la ventana, guarda PNG en data/capturas/ y devuelve el OCR por lineas.
4. astra_escribir (texto): pega texto en el campo enfocado (portapapeles + Cmd+V) sin enviar.
5. astra_preguntar (pregunta, clic_previo opcional {x,y} 0-1, confirmar: z.literal(true)): clic opcional en el campo, pega, presiona Return, espera y devuelve el OCR del chat.
6. astra_clic (x, y 0-1, confirmar: z.literal(true)): clic en la ventana.

REGLAS: nunca console.log; usa run() de src/lib/exec.ts con argumentos; valida con zod y .describe(); si falta la app o un permiso, devuelve error() con instrucciones (Ajustes del sistema > Privacidad y seguridad); compila el helper Swift una vez y usalo desde src/lib/astra.ts; documenta permisos y limitaciones honestas en README.md e INVESTIGACION.md (la lectura depende del OCR y el foco del campo). |

# Antes de empezar

1. Lee `AGENTS.md` y respeta TODAS sus reglas (sin console.log, sin shell con texto del modelo, validar entradas, annotations, etc.).
2. Mira `src/tools/_ejemplo.ts` y `src/lib/` para ver el patron. Puedes crear herramientas con `npm run new-tool -- nombre`.

# Fase 1 - Investigar (NO escribas codigo todavia)

Averigua como se puede controlar **Astra AI** desde fuera, probando estas vias de la mas robusta a la mas fragil:

1. API HTTP / WebSocket / plugin oficial  2. CLI de la app  3. Archivos de datos que se puedan leer/escribir  4. Scripting del sistema operativo  5. Automatizacion de interfaz (ultimo recurso)

Pistas para macOS:
- La app suele estar en `/Applications` o `/System/Applications`. Mira `Contents/Info.plist` (`plutil -p`) y `Contents/MacOS`, `Contents/Resources` por si trae una CLI.
- **AppleScript / JXA**: comprueba si la app es "scriptable" con `sdef "/ruta/App.app"` (muestra su diccionario de comandos). Si lo es, es la mejor via: se ejecuta con `osascript` pasando los valores como ARGUMENTOS del script (`on run argv`), nunca pegados al texto.
- Revisa si la app tiene API local, un esquema de URL (`open "app://..."`) o archivos de datos en `~/Library/Application Support`.
- La primera vez macOS puede pedir permiso de Automatizacion; documentalo en el README.

Tambien puedes consultar la documentacion oficial de la app en internet (webfetch / websearch).

**Reglas de la investigacion:** usa solo comandos de LECTURA (`--help`, `--version`, listar, leer metadatos). No abras, cierres, borres ni modifiques nada del usuario mientras investigas.

Escribe tus hallazgos en `INVESTIGACION.md` (via elegida, por que, alternativas descartadas, limitaciones).

# Fase 2 - Disenar

Define entre **4 y 8 herramientas** pequenas y utiles (una accion clara cada una). Empieza por las de solo lectura. Para cada una decide: nombre en snake_case, descripcion (que hace y CUANDO usarla), parametros con `.describe()`, y si es de solo lectura, modifica datos o es destructiva.

# Fase 3 - Implementar

- Codigo en `src/tools/astra-ai.ts` (puedes dividir en varios archivos dentro de `src/tools/`). Cada archivo exporta `register(server)`.
- Declara `annotations` en cada herramienta. Las destructivas exigen un parametro `confirmar: z.literal(true)`.
- Valida toda entrada. Usa `run()` de `src/lib/exec.ts` para ejecutar programas.
- Devuelve errores con `error("mensaje que explique como corregir")`.
- Si la app debe estar abierta o instalada para que una herramienta funcione, detectalo y explicalo en el error.

# Fase 4 - Verificar

1. Ejecuta `npm run build` y `npm test` hasta que pasen.
2. Prueba tu mismo las herramientas de SOLO LECTURA contra la app real cuando sea posible (por ejemplo con un script temporal que use el cliente MCP) y corrige lo que falle. No pruebes las que modifican o borran datos.

# Fase 5 - Documentar

Crea `README.md` en espanol: que hace el MCP, tabla de herramientas (nombre, que hace, si modifica datos), 3 ejemplos de frases para pedirselas a la IA, requisitos y permisos del sistema, y limitaciones conocidas. Se honesto: si algo no pudo probarse, dilo.

# Fase 6 - Arranque conjunto (SOLO si la app lo necesita)

El proyecto ya trae un lanzador generico (`Abrir-astra-ai.bat` / `.command`) que abre **Astra AI** y opencode a la vez. Si en la Fase 1 descubriste que la app debe arrancar de forma especial para poder controlarla (un parametro como `--control`, `--port` o `--remote-debugging-port`, un servidor o puente propio, un plugin que hay que activar), NO crees `.bat` propios ni dependas de la app de escritorio de opencode. Crea en su lugar `scripts/preparar-app.mjs` (solo modulos de Node, funciona en Windows y Mac) con este contrato. Puedes importar `./lib-arranque.mjs` (`esperarPuerto`, `puertoAbierto`, `appEnEjecucion`):

```js
export default async function preparar({ raiz, app, rutaApp, slug }) {
  // 1. Abre la app con los parametros necesarios (sin cerrar instancias que el usuario ya tenga abiertas).
  // 2. Espera a que este lista (con limite de tiempo y un error claro si no lo logra).
  // 3. Si la app trae su propio puente/servidor MCP, registralo en opencode.json del proyecto como
  //    mcp.<nombre> = { type: "local", command: [...] }  (objeto plano dentro de "mcp").
  return {
    appAbierta: true,
    nombreMcp: slug + "_estado", // nombre con el que se registrara el MCP de ESTE proyecto, distinto de los que anadiste
    puente: { host: "127.0.0.1", port: 9877, ping: false, timeoutS: 60 }, // SOLO si la app expone un puerto/puente local
  };
}
```

Si la app tiene un puente local en un puerto, el lanzador lo espera antes de abrir opencode, evita abrir la app dos veces si el puente ya responde, y `Cerrar-astra-ai.bat` / `node scripts/estado-mcp.mjs` lo usan para cerrar y diagnosticar. Si el puerto es fijo y no depende de la ejecucion, puedes declararlo ademas en `.mcp-constructor.json` como `"puente": { "host", "port", "ping", "timeoutS" }`.

Si la app NO necesita nada especial, no crees ese archivo.

# Entregable

Termina SOLO cuando `npm run build` y `npm test` pasen. Cierra con un resumen breve de lo que construiste y lo que no pudiste verificar.
