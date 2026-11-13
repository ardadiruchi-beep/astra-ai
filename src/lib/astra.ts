import { fileURLToPath } from "node:url";
import path from "node:path";
import { run } from "./exec.js";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HELPER_SRC = path.join(PROJECT_ROOT, "helper", "astra-helper.swift");
const HELPER_BIN = path.join(PROJECT_ROOT, "helper", "astra-helper");
const APP_NAME = "Astra AI";

let helperReady = false;

export async function ensureHelper(): Promise<{ ok: boolean; error?: string }> {
  if (helperReady) return { ok: true };
  const fs = await import("node:fs/promises");
  const srcExists = await fs.access(HELPER_SRC).then(() => true, () => false);
  if (!srcExists) return { ok: false, error: `No se encontro el helper Swift en ${HELPER_SRC}.` };
  const binExists = await fs.access(HELPER_BIN).then(() => true, () => false);
  if (!binExists) {
    const r = await run("swiftc", ["-O", "-parse-as-library", HELPER_SRC, "-o", HELPER_BIN], { timeoutMs: 120_000 });
    if (r.code !== 0) return { ok: false, error: `No se pudo compilar el helper: ${r.stderr}` };
  }
  helperReady = true;
  return { ok: true };
}

export interface AstraInfo {
  running: boolean;
  windowId: number | null;
  title: string;
  bounds: { x: number; y: number; width: number; height: number } | null;
  accessibility: boolean;
  screenRecording: boolean;
}

export async function astraInfo(): Promise<AstraInfo | { error: string }> {
  const h = await ensureHelper();
  if (!h.ok) return { error: h.error! };
  const r = await run(HELPER_BIN, ["info"], { timeoutMs: 15_000 });
  if (r.code !== 0) return { error: r.stderr || "No se pudo obtener info de Astra." };
  try {
    const d = JSON.parse(r.stdout) as any;
    return {
      running: !!d.running,
      windowId: d.windowId === null ? null : Number(d.windowId),
      title: String(d.title ?? ""),
      bounds: d.bounds && d.bounds !== null ? d.bounds : null,
      accessibility: !!d.accessibility,
      screenRecording: !!d.screenRecording,
    };
  } catch {
    return { error: `Respuesta invalida del helper: ${r.stdout}` };
  }
}

export async function astraCapture(outPath: string): Promise<{ ok: boolean; path?: string; error?: string }> {
  const h = await ensureHelper();
  if (!h.ok) return { ok: false, error: h.error };
  const r = await run(HELPER_BIN, ["capture", outPath], { timeoutMs: 30_000 });
  try {
    const d = JSON.parse(r.stdout) as any;
    if (d.ok) return { ok: true, path: d.path };
    return { ok: false, error: d.error || "Captura fallida." };
  } catch {
    return { ok: false, error: r.stderr || r.stdout || "Captura fallida." };
  }
}

export async function astraOcr(imagePath: string): Promise<string[]> {
  const h = await ensureHelper();
  if (!h.ok) return [];
  const r = await run(HELPER_BIN, ["ocr", imagePath], { timeoutMs: 60_000 });
  return r.stdout.split("\n").map((l) => l.trimEnd()).filter((l) => l.length > 0);
}

export async function abrirApp(): Promise<void> {
  await run("open", ["-a", APP_NAME], { timeoutMs: 10_000 });
}

export async function activarApp(): Promise<void> {
  await run("osascript", ["-e", `tell application "${APP_NAME}" to activate`], { timeoutMs: 10_000 });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function clickAt(x: number, y: number): Promise<{ ok: boolean; error?: string }> {
  const script = `tell application "System Events" to click at {${Math.round(x)}, ${Math.round(y)}}`;
  const r = await run("osascript", ["-e", script], { timeoutMs: 10_000 });
  if (r.code !== 0) return { ok: false, error: r.stderr || "No se pudo hacer clic. Verifica el permiso de Accesibilidad." };
  return { ok: true };
}

export async function pegarPortapapeles(): Promise<{ ok: boolean; error?: string }> {
  const script = `tell application "System Events" to keystroke "v" using command down`;
  const r = await run("osascript", ["-e", script], { timeoutMs: 10_000 });
  if (r.code !== 0) return { ok: false, error: r.stderr || "No se pudo pegar. Verifica el permiso de Accesibilidad." };
  return { ok: true };
}

export async function presionarReturn(): Promise<{ ok: boolean; error?: string }> {
  const script = `tell application "System Events" to keystroke return`;
  const r = await run("osascript", ["-e", script], { timeoutMs: 10_000 });
  if (r.code !== 0) return { ok: false, error: r.stderr || "No se pudo presionar Return." };
  return { ok: true };
}

export async function copiarPortapapeles(texto: string): Promise<void> {
  await run("pbcopy", [], { input: texto, timeoutMs: 10_000 });
}

export function dataCapturasDir(): string {
  return path.join(PROJECT_ROOT, "data", "capturas");
}
