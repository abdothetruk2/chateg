import mongoose from "mongoose";
import MediaFile from "../../../../models/MediaFile";
import connectDB from "../../../../lib/mongoose";

function getFilenameHeader(filename = "media") {
  const safeName = filename.replace(/["\r\n]/g, "");
  return `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(
    safeName
  )}`;
}

function parseRange(rangeHeader, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || "");
  if (!match) return null;

  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || end < start || start >= size) return null;

  end = Math.min(end, size - 1);

  return { start, end };
}

export async function GET(req, context) {
  const { id } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return new Response("Media not found", { status: 404 });
  }

  await connectDB();

  const media = await MediaFile.findById(id).select(
    "data contentType size filename originalName updatedAt"
  );

  if (!media) {
    return new Response("Media not found", { status: 404 });
  }

  const buffer = Buffer.from(media.data);
  const size = media.size || buffer.byteLength;
  const baseHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": getFilenameHeader(media.originalName || media.filename),
    "Content-Type": media.contentType,
  };

  const range = parseRange(req.headers.get("range"), size);

  if (range) {
    const chunk = buffer.subarray(range.start, range.end + 1);

    return new Response(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
      },
    });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      ...baseHeaders,
      "Content-Length": String(size),
    },
  });
}
