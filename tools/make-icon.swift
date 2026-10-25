// Draws icon.png: two open pages on a dark square. Run: swift tools/make-icon.swift
import AppKit

let size = 180
let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
    samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
    bytesPerRow: 0, bitsPerPixel: 0)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

NSColor(calibratedRed: 0.067, green: 0.067, blue: 0.067, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: size, height: size).fill()

let pageWidth: CGFloat = 62
let pageHeight: CGFloat = 92
let top: CGFloat = (CGFloat(size) - pageHeight) / 2
for x in [CGFloat(size) / 2 - pageWidth - 2, CGFloat(size) / 2 + 2] {
    NSColor.white.setFill()
    NSBezierPath(roundedRect: NSRect(x: x, y: top, width: pageWidth, height: pageHeight), xRadius: 4, yRadius: 4).fill()
    NSColor(calibratedWhite: 0.7, alpha: 1).setFill()
    for line in 0..<6 {
        NSRect(x: x + 10, y: top + pageHeight - 18 - CGFloat(line) * 12, width: pageWidth - 20, height: 4).fill()
    }
}

NSGraphicsContext.restoreGraphicsState()

let out = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon.png")
try! rep.representation(using: .png, properties: [:])!.write(to: out)
print("Wrote \(out.path)")
