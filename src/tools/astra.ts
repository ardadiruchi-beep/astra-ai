import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { texto, json, error } from "../lib/respuestas.js";
import {
  astraInfo,
  astraCapture,
  astraOcr,
  abrirApp,
  activarApp,
  sleep,
  clickAt,
  pegarPortapapeles,
  presionarReturn,
  copiarPortapapeles,
  dataCapturasDir,
} from "../lib/astra.js";

export function register(server: McpServer): void {
  server.registerTool(
    "astra_estado",
    {
      title: "Estado de Astra AI",
      description: "Indica si Astra AI esta abierta, devuelve la ventana y los permisos de Accesibilidad y Grabacion de pantalla. Solo lectura.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const info = await astraInfo();
      if ("error" in info) return error(info.error);
      const nota: string[] = [];
      if (!info.running) nota.push("Astra AI no esta abierta. Usa astra_abrir.");
      if (!info.accessibility) nota.push("Falta el permiso de Accesibilidad: Ajustes del Sistema > Privacidad y seguridad > Accesibilidad.");
      if (!info.screenRecording) nota.push("Falta el permiso de Grabacion de pantalla: Ajustes del Sistema > Privacidad y seguridad > Grabacion de pantalla.");
      return json({ ...info, nota: nota.length ? nota : "OK" });
    },
  );

  server.registerTool(
    "astra_abrir",
    {
      title: "Abrir Astra AI",
      description: "Abre Astra AI y la trae al frente. Usala antes de interactuar con la app.",
      inputSchema: {},
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async () => {
      await abrirApp();
      await sleep(1500);
      await activarApp();
      await sleep(500);
      const info = await astraInfo();
      if ("error" in info) return error(info.error);
      if (!info.running) return error("No se pudo abrir Astra AI. Verifica que este instalada en /Applications/Astra AI.app.");
      return texto("Astra AI abierta y en primer plano.");
    },
  );

  server.registerTool(
    "astra_ver",
    {
      title: "Ver pantalla de Astra AI",
      description: "Captura la ventana de Astra AI, guarda un PNG en data/capturas/ y devuelve el texto reconocido por OCR (lineas de arriba a abajo). Solo lectura. Util para leer la respuesta de la IA o navegar la interfaz.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const info = await astraInfo();
      if ("error" in info) return error(info.error);
      if (!info.running) return error("Astra AI no esta abierta. Usa astra_abrir.");
      if (!info.screenRecording) return error("Falta el permiso de Grabacion de pantalla. Concedelo en Ajustes del Sistema > Privacidad y seguridad > Grabacion de pantalla.");
      await mkdir(dataCapturasDir(), { recursive: true });
      const outPath = path.join(dataCapturasDir(), `astra-${Date.now()}.png`);
      const cap = await astraCapture(outPath);
      if (!cap.ok) return error(cap.error || "No se pudo capturar la ventana.");
      const lines = await astraOcr(cap.path!);
      return json({ captura: cap.path, ocr: lines });
    },
  );

  server.registerTool(
    "astra_escribir",
    {
      title: "Escribir texto en Astra AI",
      description: "Pega texto en el campo enfocado de Astra AI (portapapeles + Cmd+V) sin enviar. No modifica datos permanentes por si solo; prepara el texto para enviar con astra_preguntar.",
      inputSchema: {
        texto: z.string().min(1).describe("Texto a pegar en el campo enfocado"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ texto: t }) => {
      const info = await astraInfo();
      if ("error" in info) return error(info.error);
      if (!info.running) return error("Astra AI no esta abierta. Usa astra_abrir.");
      if (!info.accessibility) return error("Falta el permiso de Accesibilidad. Concedelo en Ajustes del Sistema > Privacidad y seguridad > Accesibilidad.");
      await activarApp();
      await sleep(300);
      await copiarPortapapeles(t);
      await sleep(200);
      const r = await pegarPortapapeles();
      if (!r.ok) return error(r.error || "No se pudo pegar el texto.");
      return texto("Texto pegado en el campo enfocado de Astra AI.");
    },
  );

  server.registerTool(
    "astra_preguntar",
    {
      title: "Preguntar a Astra AI",
      description: "Envia una pregunta a Astra AI: clic opcional en el campo, pega la pregunta, presiona Return, espera la respuesta y devuelve el OCR del chat. Accion que envia datos; requiere confirmar=true.",
      inputSchema: {
        pregunta: z.string().min(1).describe("Pregunta a enviar a Astra AI"),
        clic_previo: z
          .object({
            x: z.number().min(0).max(1).describe("Coordenada X normalizada (0-1) dentro de la ventana para enfocar el campo"),
            y: z.number().min(0).max(1).describe("Coordenada Y normalizada (0-1) dentro de la ventana para enfocar el campo"),
          })
          .optional()
          .describe("Clic opcional previo para enfocar el campo de texto"),
        confirmar: z.literal(true).describe("Debe ser true para confirmar el envio"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ pregunta, clic_previo }) => {
      const info = await astraInfo();
      if ("error" in info) return error(info.error);
      if (!info.running) return error("Astra AI no esta abierta. Usa astra_abrir.");
      if (!info.accessibility) return error("Falta el permiso de Accesibilidad. Concedelo en Ajustes del Sistema > Privacidad y seguridad > Accesibilidad.");
      if (!info.screenRecording) return error("Falta el permiso de Grabacion de pantalla. Concedelo en Ajustes del Sistema > Privacidad y seguridad > Grabacion de pantalla.");
      if (!info.bounds) return error("No se pudo obtener los limites de la ventana de Astra AI.");

      await activarApp();
      await sleep(300);

      if (clic_previo) {
        const sx = info.bounds.x + clic_previo.x * info.bounds.width;
        const sy = info.bounds.y + clic_previo.y * info.bounds.height;
        const cr = await clickAt(sx, sy);
        if (!cr.ok) return error(cr.error || "No se pudo hacer clic.");
        await sleep(300);
      }

      await copiarPortapapeles(pregunta);
      await sleep(200);
      const pr = await pegarPortapapeles();
      if (!pr.ok) return error(pr.error || "No se pudo pegar la pregunta.");
      await sleep(200);
      const rr = await presionarReturn();
      if (!rr.ok) return error(rr.error || "No se pudo enviar la pregunta.");

      await sleep(6000);

      await mkdir(dataCapturasDir(), { recursive: true });
      const outPath = path.join(dataCapturasDir(), `astra-${Date.now()}.png`);
      const cap = await astraCapture(outPath);
      if (!cap.ok) return error(cap.error || "No se pudo capturar la respuesta.");
      const lines = await astraOcr(cap.path!);
      return json({ pregunta, respuesta_ocr: lines, captura: cap.path });
    },
  );

  server.registerTool(
    "astra_clic",
    {
      title: "Clic en Astra AI",
      description: "Hace clic en una coordenada normalizada (0-1) dentro de la ventana de Astra AI. Accion que puede modificar el estado de la app; requiere confirmar=true.",
      inputSchema: {
        x: z.number().min(0).max(1).describe("Coordenada X normalizada (0-1) dentro de la ventana"),
        y: z.number().min(0).max(1).describe("Coordenada Y normalizada (0-1) dentro de la ventana"),
        confirmar: z.literal(true).describe("Debe ser true para confirmar el clic"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ x, y }) => {
      const info = await astraInfo();
      if ("error" in info) return error(info.error);
      if (!info.running) return error("Astra AI no esta abierta. Usa astra_abrir.");
      if (!info.accessibility) return error("Falta el permiso de Accesibilidad. Concedelo en Ajustes del Sistema > Privacidad y seguridad > Accesibilidad.");
      if (!info.bounds) return error("No se pudo obtener los limites de la ventana de Astra AI.");
      const sx = info.bounds.x + x * info.bounds.width;
      const sy = info.bounds.y + y * info.bounds.height;
      const r = await clickAt(sx, sy);
      if (!r.ok) return error(r.error || "No se pudo hacer clic.");
      return texto(`Clic realizado en (${x}, ${y}) -> (${Math.round(sx)}, ${Math.round(sy)}).`);
    },
  );
}
