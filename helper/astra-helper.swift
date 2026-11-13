import Cocoa
import Vision
import CoreGraphics
import ApplicationServices
import ScreenCaptureKit
import Foundation

struct WindowInfo {
    let id: CGWindowID
    let owner: String
    let name: String
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

func accessibilityTrusted() -> Bool {
    return AXIsProcessTrusted()
}

func screenRecordingGranted() -> Bool {
    return CGPreflightScreenCaptureAccess()
}

func findAstraWindowInfo() -> WindowInfo? {
    guard let list = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] else { return nil }
    var best: WindowInfo? = nil
    var bestArea: Double = 0
    for w in list {
        guard let owner = w[kCGWindowOwnerName as String] as? String else { continue }
        if owner != "Astra AI" { continue }
        let layer = (w[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0
        if layer != 0 { continue }
        guard let boundsDict = w[kCGWindowBounds as String] as? [String: Any] else { continue }
        let x = (boundsDict["X"] as? NSNumber)?.doubleValue ?? 0
        let y = (boundsDict["Y"] as? NSNumber)?.doubleValue ?? 0
        let width = (boundsDict["Width"] as? NSNumber)?.doubleValue ?? 0
        let height = (boundsDict["Height"] as? NSNumber)?.doubleValue ?? 0
        if width < 200 || height < 200 { continue }
        let area = width * height
        if area <= bestArea { continue }
        bestArea = area
        let wid = (w[kCGWindowNumber as String] as? NSNumber)?.uint32Value ?? 0
        let name = (w[kCGWindowName as String] as? String) ?? ""
        best = WindowInfo(id: wid, owner: owner, name: name, x: x, y: y, width: width, height: height)
    }
    return best
}

func ocrImage(_ path: String) -> [String] {
    guard let image = NSImage(contentsOfFile: path) else { return [] }
    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return [] }
    var lines: [String] = []
    let sem = DispatchSemaphore(value: 0)
    let request = VNRecognizeTextRequest { req, err in
        guard let results = req.results as? [VNRecognizedTextObservation] else { sem.signal(); return }
        let sorted = results.sorted { a, b in
            let ay = a.boundingBox.origin.y + a.boundingBox.height
            let by = b.boundingBox.origin.y + b.boundingBox.height
            if abs(ay - by) > 0.015 { return ay > by }
            return a.boundingBox.origin.x < b.boundingBox.origin.x
        }
        for r in sorted {
            if let cand = r.topCandidates(1).first {
                lines.append(cand.string)
            }
        }
        sem.signal()
    }
    request.recognitionLevel = .accurate
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
        try handler.perform([request])
    } catch {
        sem.signal()
    }
    sem.wait()
    return lines
}

func printJSON(_ obj: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: obj, options: []),
       let s = String(data: data, encoding: .utf8) {
        print(s)
    } else {
        print("{}")
    }
}

func findSCWindow() async -> SCWindow? {
    do {
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        let astraWindows = content.windows.filter { w in
            let name = w.owningApplication?.applicationName ?? ""
            let bid = w.owningApplication?.bundleIdentifier ?? ""
            return name.contains("Astra") || bid == "com.astra-ai.app"
        }
        return astraWindows.max { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }
    } catch {
        return nil
    }
}

@main
struct AstraHelper {
    static func main() async {
        let args = CommandLine.arguments
        guard args.count >= 2 else {
            fputs("Uso: astra-helper <info|capture|ocr> ...\n", stderr)
            exit(1)
        }
        let cmd = args[1]
        switch cmd {
        case "info":
            let win = findAstraWindowInfo()
            var dict: [String: Any] = [:]
            dict["accessibility"] = accessibilityTrusted()
            dict["screenRecording"] = screenRecordingGranted()
            if let w = win {
                dict["running"] = true
                dict["windowId"] = Int(w.id)
                dict["title"] = w.name
                dict["bounds"] = ["x": w.x, "y": w.y, "width": w.width, "height": w.height]
            } else {
                dict["running"] = false
                dict["windowId"] = NSNull()
                dict["bounds"] = NSNull()
            }
            printJSON(dict)

        case "capture":
            guard args.count >= 3 else {
                fputs("Falta ruta de salida\n", stderr)
                exit(1)
            }
            let out = args[2]
            guard screenRecordingGranted() else {
                printJSON(["ok": false, "error": "Falta el permiso de Grabacion de pantalla. Concedelo en Ajustes del Sistema > Privacidad y seguridad > Grabacion de pantalla."])
                exit(1)
            }
            guard let w = findAstraWindowInfo() else {
                printJSON(["ok": false, "error": "No se encontro la ventana de Astra AI. Abre la app."])
                exit(1)
            }
            // Captura pantalla completa (screencapture -l <id> no funciona con apps iOS "Designed for iPad")
            // y recorta a los limites de la ventana.
            let tmp = (NSTemporaryDirectory() as NSString).appendingPathComponent("astra-full.png")
            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
            proc.arguments = ["-x", tmp]
            do {
                try proc.run()
                proc.waitUntilExit()
            } catch {
                printJSON(["ok": false, "error": "No se pudo ejecutar screencapture: \(error.localizedDescription)"])
                exit(1)
            }
            guard proc.terminationStatus == 0, FileManager.default.fileExists(atPath: tmp) else {
                printJSON(["ok": false, "error": "screencapture fallo. Verifica el permiso de Grabacion de pantalla."])
                exit(1)
            }
            guard let fullImage = NSImage(contentsOfFile: tmp),
                  let cgFull = fullImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
                printJSON(["ok": false, "error": "No se pudo leer la captura."])
                exit(1)
            }
            let screenW = NSScreen.main?.frame.width ?? w.x + w.width
            let scale = CGFloat(cgFull.width) / screenW
            let cropRect = CGRect(x: w.x * scale, y: w.y * scale, width: w.width * scale, height: w.height * scale)
            guard let cropped = cgFull.cropping(to: cropRect) else {
                printJSON(["ok": false, "error": "No se pudo recortar la ventana."])
                exit(1)
            }
            let rep = NSBitmapImageRep(cgImage: cropped)
            guard let data = rep.representation(using: .png, properties: [:]) else {
                printJSON(["ok": false, "error": "No se pudo codificar la captura."])
                exit(1)
            }
            do {
                try data.write(to: URL(fileURLWithPath: out))
            } catch {
                printJSON(["ok": false, "error": "No se pudo guardar la captura: \(error.localizedDescription)"])
                exit(1)
            }
            try? FileManager.default.removeItem(atPath: tmp)
            printJSON(["ok": true, "path": out, "windowId": Int(w.id), "bounds": ["x": w.x, "y": w.y, "width": w.width, "height": w.height]])

        case "ocr":
            guard args.count >= 3 else {
                fputs("Falta ruta de imagen\n", stderr)
                exit(1)
            }
            let path = args[2]
            let lines = ocrImage(path)
            for l in lines { print(l) }

        default:
            fputs("Comando desconocido: \(cmd)\n", stderr)
            exit(1)
        }
    }
}
