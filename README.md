# MCP de Astra AI (astra-ai)

Servidor MCP (Model Context Protocol) en TypeScript que permite a un asistente de IA controlar la aplicación **Astra AI** (`/Applications/Astra AI.app`) en macOS: abrir la app, escribir preguntas, enviarlas, leer las respuestas mediante OCR y hacer clics en la interfaz.

## Herramientas

| Herramienta | Qué hace | Modifica datos |
|---|---|---|
| `astra_estado` | Indica si Astra AI está abierta, ventana y permisos (Accesibilidad, Grabación de pantalla) | No |
| `astra_abrir` | Abre Astra AI y la trae al frente | No |
| `astra_ver` | Captura la ventana, guarda un PNG en `data/capturas/` y devuelve el OCR por líneas | No |
| `astra_escribir` | Pega texto en el campo enfocado (portapapeles + Cmd+V) sin enviar | Sí (campo) |
| `astra_preguntar` | Clic opcional, pega la pregunta, presiona Return, espera y devuelve el OCR del chat | Sí (envía) |
| `astra_clic` | Clic en una coordenada normalizada (0-1) dentro de la ventana | Sí |

## Ejemplos de frases

- "Abre Astra AI y dime qué ves en pantalla."
- "Pregúntale a Astra: ¿qué es la inmunología clínica? y muéstrame la respuesta."
- "Haz clic en el botón de enviar (coordenadas 0.9, 0.95) y luego lee la respuesta."

## Requisitos y permisos

- macOS con Astra AI instalada en `/Applications/Astra AI.app`.
- Node.js >= 18.
- `swiftc` disponible (para compilar el helper de OCR/ventana/permisos).
- Permisos del sistema:
  - **Accesibilidad**: Ajustes del Sistema > Privacidad y seguridad > Accesibilidad (para clics y teclas).
  - **Grabación de pantalla**: Ajustes del Sistema > Privacidad y seguridad > Grabación de pantalla (para capturas).

## Limitaciones conocidas

- La lectura de la interfaz depende del OCR y del foco del campo de texto; no hay acceso estructurado a la UI.
- Si el campo de texto no está enfocado, `astra_escribir`/`astra_preguntar` pegan en el elemento que tenga el foco (usa `clic_previo` para enfocar).
- El OCR puede tener errores en texto pequeño o de bajo contraste.
- Las coordenadas son normalizadas (0-1) dentro de la ventana.
- La ventana de apps iOS puede cambiar de id entre sesiones; el helper la redescubre automáticamente.

## Instalación paso a paso

1. Clona el repositorio:
   ```bash
   git clone https://github.com/ardadiruchi-beep/astra-ai.git
   cd astra-ai
   ```
2. Instala dependencias y compila:
   ```bash
   npm install
   npm run build
   ```
   El helper de OCR (`helper/astra-helper.swift`) se compila solo con `swiftc` la primera vez que se usa.
3. Concede los permisos del sistema (ver sección anterior) y reinicia opencode.
4. Registra el MCP en la configuración de opencode (`~/.config/opencode/opencode.jsonc`):
   ```jsonc
   "astra-ai": {
     "type": "local",
     "command": ["node", "/ruta/al/repo/astra-ai/dist/index.js"],
     "enabled": true,
     "timeout": 60000
   }
   ```
   (ajusta `/ruta/al/repo` a la carpeta donde lo clonaste).
5. Reinicia opencode y prueba con: "Usa astra_estado y dime qué permisos faltan".

## Compilación y pruebas

```bash
npm run build
npm test
```

Debe terminar con `Prueba de humo superada.`

## Documentación del proyecto

- [`INVESTIGACION.md`](INVESTIGACION.md) — vías de integración probadas y elegida.
- [`UTILIDAD_ACADEMICA.md`](UTILIDAD_ACADEMICA.md) — qué problema resuelve y en qué dimensión del aprendizaje aporta.
- [`DECLARACION-IA.md`](DECLARACION-IA.md) — uso de IA, límites conocidos y consideraciones de seguridad.
- [`PROMPT.md`](PROMPT.md) — encargo original con el que se construyó (transparencia).