// Writes a numbered test PDF. Run: swift tools/make-sample-pdf.swift out.pdf [pages]
import AppKit

let args = CommandLine.arguments
let out = URL(fileURLWithPath: args.count > 1 ? args[1] : "sample.pdf")
let pages = args.count > 2 ? Int(args[2]) ?? 9 : 9
var box = CGRect(x: 0, y: 0, width: 595, height: 842)
let context = CGContext(out as CFURL, mediaBox: &box, nil)!

for page in 1...pages {
    context.beginPDFPage(nil)
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
    let text = NSAttributedString(string: "\(page)", attributes: [.font: NSFont.boldSystemFont(ofSize: 220)])
    let size = text.size()
    text.draw(at: NSPoint(x: (box.width - size.width) / 2, y: (box.height - size.height) / 2))
    NSString(string: "Page \(page) of \(pages)").draw(at: NSPoint(x: 40, y: 40), withAttributes: [.font: NSFont.systemFont(ofSize: 24)])
    context.endPDFPage()
}
context.closePDF()
print("Wrote \(out.path)")
