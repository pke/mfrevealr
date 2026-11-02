// Removes the white background from product renders, keeping the soft drop shadow
// as semi-transparent black.
// usage: swiftc -O scripts/cutout.swift -o /tmp/cutout && /tmp/cutout <input> <output.png> [...]
//        then: cwebp -q 90 -alpha_q 100 -m 6 out.png -o <code>.webp
//        CUTOUT_SMOOTHNESS=0.005 keeps pale accessories that would otherwise fade out.
import AppKit
import CoreImage
import Vision

func rgbaPixels(_ image: CGImage) -> [UInt8] {
    let w = image.width, h = image.height
    var data = [UInt8](repeating: 0, count: w * h * 4)
    let ctx = CGContext(
        data: &data, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
        space: CGColorSpace(name: CGColorSpace.sRGB)!,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    // Flatten onto white so any existing transparency reads as background.
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
    return data
}

func subjectMask(_ image: CGImage) throws -> [UInt8] {
    let handler = VNImageRequestHandler(cgImage: image)
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])
    guard let result = request.results?.first else {
        throw NSError(domain: "cutout", code: 1, userInfo: [NSLocalizedDescriptionKey: "no subject found"])
    }
    let buffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
    let mask = CIImage(cvPixelBuffer: buffer)
    let w = image.width, h = image.height
    var data = [UInt8](repeating: 0, count: w * h)
    CIContext().render(
        mask, toBitmap: &data, rowBytes: w, bounds: CGRect(x: 0, y: 0, width: w, height: h),
        format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
    return data
}

func morph(_ src: [Bool], _ w: Int, _ h: Int, radius: Int, grow: Bool) -> [Bool] {
    var dst = src
    for y in 0..<h {
        for x in 0..<w {
            var hit = !grow
            outer: for dy in -radius...radius {
                for dx in -radius...radius {
                    let xx = x + dx, yy = y + dy
                    let v = xx >= 0 && yy >= 0 && xx < w && yy < h ? src[yy * w + xx] : false
                    if grow && v { hit = true; break outer }
                    if !grow && !v { hit = false; break outer }
                }
            }
            dst[y * w + x] = hit
        }
    }
    return dst
}

/// Adds objects the subject detection missed (small white accessories, white patches)
/// and keeps the soft shadow as background: background is pure white plus smooth,
/// unsaturated pixels reachable from the image border; anything walled off by
/// sharper edges is an object.
/// Gradient below which unsaturated pixels count as smooth shadow; lower keeps more
/// pale accessories that barely stand out from the background.
let smoothness = Double(ProcessInfo.processInfo.environment["CUTOUT_SMOOTHNESS"] ?? "") ?? 0.015

func refine(_ px: [UInt8], _ mask: [UInt8], _ w: Int, _ h: Int) -> [Double] {
    let n = w * h
    var lum = [Double](repeating: 0, count: n)
    var sat = [Double](repeating: 0, count: n)
    var pure = [Bool](repeating: false, count: n)
    for i in 0..<n {
        let r = Double(px[i * 4]) / 255, g = Double(px[i * 4 + 1]) / 255, b = Double(px[i * 4 + 2]) / 255
        lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b
        sat[i] = max(r, g, b) - min(r, g, b)
        pure[i] = min(r, g, b) >= 252.0 / 255
    }
    var grad = [Double](repeating: 0, count: n)
    for y in 1..<(h - 1) {
        for x in 1..<(w - 1) {
            func l(_ dx: Int, _ dy: Int) -> Double { lum[(y + dy) * w + x + dx] }
            let gx = l(1, -1) + 2 * l(1, 0) + l(1, 1) - l(-1, -1) - 2 * l(-1, 0) - l(-1, 1)
            let gy = l(-1, 1) + 2 * l(0, 1) + l(1, 1) - l(-1, -1) - 2 * l(0, -1) - l(1, -1)
            grad[y * w + x] = (gx * gx + gy * gy).squareRoot() / 8
        }
    }
    let passable = (0..<n).map { i in
        mask[i] < 128 && sat[i] < 0.08 && (pure[i] || grad[i] < smoothness)
    }
    var background = [Bool](repeating: false, count: n)
    var stack: [Int] = []
    for x in 0..<w { stack.append(x); stack.append((h - 1) * w + x) }
    for y in 0..<h { stack.append(y * w); stack.append(y * w + w - 1) }
    while let i = stack.popLast() {
        if background[i] || !passable[i] { continue }
        background[i] = true
        let x = i % w, y = i / w
        if x > 0 { stack.append(i - 1) }
        if x < w - 1 { stack.append(i + 1) }
        if y > 0 { stack.append(i - w) }
        if y < h - 1 { stack.append(i + w) }
    }
    // Missed object pixels; opening removes the thin anti-aliased rim around everything.
    let missed = (0..<n).map { !background[$0] && mask[$0] < 128 }
    let opened = morph(morph(missed, w, h, radius: 2, grow: false), w, h, radius: 2, grow: true)
    // Keep only sizeable regions.
    var label = [Int](repeating: -1, count: n)
    var keep = [Bool](repeating: false, count: n)
    let minArea = max(40, n / 700)
    for start in 0..<n where opened[start] && label[start] < 0 {
        var members: [Int] = []
        stack = [start]
        label[start] = start
        while let i = stack.popLast() {
            members.append(i)
            let x = i % w, y = i / w
            for j in [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]
            where j >= 0 && opened[j] && label[j] < 0 {
                label[j] = start
                stack.append(j)
            }
        }
        // Enclosed gaps are pure white; soft shadow has neither real edges nor colour
        // (JPEG noise stays well below the edge threshold). A region the background
        // flood never touches is a white surface inside the figure.
        let count = Double(members.count)
        let pureFraction = Double(members.filter { pure[$0] }.count) / count
        let edgeFraction = Double(members.filter { grad[$0] > 0.08 }.count) / count
        let meanSat = members.reduce(0) { $0 + sat[$1] } / count
        let touchesBackground = members.contains { i in
            let x = i % w, y = i / w
            return (x > 2 && background[i - 3]) || (x < w - 3 && background[i + 3])
                || (y > 2 && background[i - 3 * w]) || (y < h - 3 && background[i + 3 * w])
        }
        let enclosed = !touchesBackground
        if ProcessInfo.processInfo.environment["CUTOUT_DEBUG"] != nil && members.count >= minArea {
            let ys = members.map { $0 / w }, xs = members.map { $0 % w }
            print(String(format: "  area=%d pure=%.2f edge=%.3f sat=%.3f enclosed=%@ bbox=%d,%d-%d,%d",
                         members.count, pureFraction, edgeFraction, meanSat, enclosed ? "y" : "n",
                         xs.min()!, ys.min()!, xs.max()!, ys.max()!))
        }
        if members.count >= minArea && pureFraction < 0.6 && (enclosed || edgeFraction >= 0.03 || meanSat >= 0.12) {
            members.forEach { keep[$0] = true }
        }
    }
    let grown = morph(keep, w, h, radius: 1, grow: true)
    return (0..<n).map { i in
        let added = grown[i] ? (keep[i] ? 1.0 : 0.6) : 0
        return max(Double(mask[i]) / 255, added)
    }
}

func cutout(_ input: URL, _ output: URL) throws {
    guard let src = NSImage(contentsOf: input)?.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        throw NSError(domain: "cutout", code: 2, userInfo: [NSLocalizedDescriptionKey: "unreadable image"])
    }
    let w = src.width, h = src.height
    let px = rgbaPixels(src)
    let mask = refine(px, try subjectMask(src), w, h)
    var out = [UInt8](repeating: 0, count: w * h * 4)
    for i in 0..<(w * h) {
        let m = mask[i]
        let r = Double(px[i * 4]) / 255, g = Double(px[i * 4 + 1]) / 255, b = Double(px[i * 4 + 2]) / 255
        // Shadow: darkness below white, ignoring JPEG noise, only outside the subject.
        let darkness = 1 - (0.2126 * r + 0.7152 * g + 0.0722 * b)
        let shadow = max(0, min(1, (darkness - 0.02) / 0.98)) * (1 - m)
        // Un-blend the white background from anti-aliased subject edges.
        func unblend(_ c: Double) -> Double { m < 0.02 ? 0 : max(0, min(1, (c - (1 - m)) / m)) }
        // Subject over black shadow, premultiplied.
        let alpha = m + shadow * (1 - m)
        out[i * 4] = UInt8((unblend(r) * m * 255).rounded())
        out[i * 4 + 1] = UInt8((unblend(g) * m * 255).rounded())
        out[i * 4 + 2] = UInt8((unblend(b) * m * 255).rounded())
        out[i * 4 + 3] = UInt8((alpha * 255).rounded())
    }
    let ctx = CGContext(
        data: &out, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
        space: CGColorSpace(name: CGColorSpace.sRGB)!,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
    try rep.representation(using: .png, properties: [:])!.write(to: output)
}

let args = Array(CommandLine.arguments.dropFirst())
var failed = 0
for pair in stride(from: 0, to: args.count - 1, by: 2) {
    do {
        try cutout(URL(fileURLWithPath: args[pair]), URL(fileURLWithPath: args[pair + 1]))
    } catch {
        failed += 1
        print("FAILED \(args[pair]): \(error.localizedDescription)")
    }
}
print("done, \(failed) failed")
exit(failed == 0 ? 0 : 1)
