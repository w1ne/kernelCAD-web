// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// macOS system-only renderer/encoder. No downloaded codec or new dependency.
import AppKit
import AVFoundation
import CoreVideo

struct Card: Decodable { let title: String; let lines: [String] }
let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let cards = try JSONDecoder().decode([Card].self, from: Data(contentsOf: root.appendingPathComponent("cards.json")))
let width = 1280, height = 720, fps: Int32 = 15, secondsPerCard = 5
let colorSpace = CGColorSpaceCreateDeviceRGB()
var images: [CGImage] = []
for (i, card) in cards.enumerated() {
    let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.setFillColor(CGColor(red: 0.035, green: 0.055, blue: 0.09, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
    func draw(_ text: String, _ y: CGFloat, _ size: CGFloat, _ color: NSColor, _ mono: Bool = false) {
        let font = mono ? NSFont.monospacedSystemFont(ofSize: size, weight: .regular) : NSFont.systemFont(ofSize: size, weight: .semibold)
        (text as NSString).draw(at: NSPoint(x: 48, y: y), withAttributes: [.font: font, .foregroundColor: color])
    }
    draw("kernelCAD / Geometry quality", 652, 25, .systemTeal)
    draw(card.title, 593, 34, .white)
    for (j, line) in card.lines.enumerated() { draw(line, CGFloat(533 - j * 36), 20, NSColor(white: 0.9, alpha: 1), true) }
    draw("LOCAL VALIDATION REPLAY  |  actual recorded requests/results  |  \(i+1)/\(cards.count)", 42, 18, .systemTeal, true)
    NSGraphicsContext.restoreGraphicsState()
    let cg = context.makeImage()!
    images.append(cg)
}
let videoURL = root.appendingPathComponent("demo.mp4")
if FileManager.default.fileExists(atPath: videoURL.path) { try FileManager.default.removeItem(at: videoURL) }
let writer = try AVAssetWriter(outputURL: videoURL, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height, AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 1_500_000]])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height, kCVPixelBufferCGImageCompatibilityKey as String: true, kCVPixelBufferCGBitmapContextCompatibilityKey as String: true])
writer.add(input)
guard writer.startWriting() else { fatalError("startWriting: \(String(describing: writer.error))") }
writer.startSession(atSourceTime: .zero)
var frame: Int64 = 0
for image in images {
    var pixel: CVPixelBuffer?
    CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB, nil, &pixel)
    let buffer = pixel!
    CVPixelBufferLockBaseAddress(buffer, [])
    let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: colorSpace, bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    CVPixelBufferUnlockBaseAddress(buffer, [])
    for _ in 0..<(Int(fps) * secondsPerCard) {
        let deadline = Date().addingTimeInterval(30)
        while !input.isReadyForMoreMediaData && writer.status == .writing && Date() < deadline { try await Task.sleep(for: .milliseconds(2)) }
        guard input.isReadyForMoreMediaData && adaptor.append(buffer, withPresentationTime: CMTime(value: frame, timescale: fps)) else { fatalError("append: \(String(describing: writer.error))") }
        frame += 1
    }
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
guard done.wait(timeout: .now() + 30) == .success, writer.status == .completed else { fatalError("finishWriting: \(String(describing: writer.error))") }
// Decode representative frames from the MP4 itself for visual verification.
let asset = AVURLAsset(url: videoURL)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
for i in 0..<cards.count {
    let time = CMTime(seconds: Double(i * secondsPerCard) + 1, preferredTimescale: 600)
    let cg = try await generator.image(at: time).image
    let png = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!
    try png.write(to: root.appendingPathComponent("decoded-\(i+1).png"))
}
let duration = try await asset.load(.duration)
let tracks = try await asset.loadTracks(withMediaType: .video)
let size = try await tracks[0].load(.naturalSize)
let nominalFps = try await tracks[0].load(.nominalFrameRate)
guard abs(duration.seconds - Double(cards.count * secondsPerCard)) < 0.1, Int(size.width) == width, Int(size.height) == height else { fatalError("Encoded video dimensions/duration mismatch") }
let evidence: [String: Any] = ["encoder": "macOS AVFoundation system H.264", "width": width, "height": height, "fps": fps, "frames": frame, "durationSeconds": cards.count * secondsPerCard, "decodedDurationSeconds": duration.seconds, "decodedSize": [size.width, size.height], "decodedNominalFrameRate": nominalFps, "decodedSamplesSeconds": (0..<cards.count).map { $0 * secondsPerCard + 1 }, "provenance": "replay of actual local verify requests/results from results.json; no deployed or hardware claims"]
try JSONSerialization.data(withJSONObject: evidence, options: [.prettyPrinted, .sortedKeys]).write(to: root.appendingPathComponent("video-verification.json"))
print("Encoded \(frame) frames; decoded \(cards.count) MP4 samples for inspection.")
