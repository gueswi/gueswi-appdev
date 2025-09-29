import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const ttsRouter = Router();

/**
 * POST /api/tts/generate
 * body: { text: string, voice?: string, style?: string }
 * resp: { ok: true, audioUrl: string }
 */
ttsRouter.post("/generate", async (req, res) => {
  try {
    const { text = "", voice = "female", style = "friendly" } = req.body || {};

    // En dev: escribimos un MP3 pequeño válido (tono breve) para que el player funcione.
    // (Base64 de un mp3 muy corto ~1s; suficiente para validar UI)
    const tinyMp3Base64 =
      "SUQzAwAAAAAAI1RTU0UAAAAPAAAACAAATGF2ZjU2LjQxLjEwMAAAAAAAAAAAAAAA//tQxAADBQQACAAACAAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADAgQAAgAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAAAAAEAAAAA";

    const buf = Buffer.from(tinyMp3Base64, "base64");

    const relDir = path.join("tts");
    const relFile = path.join(relDir, `${randomUUID()}.mp3`);
    const absFile = path.join(process.cwd(), "uploads", relFile);
    fs.mkdirSync(path.dirname(absFile), { recursive: true });
    fs.writeFileSync(absFile, buf);

    // Devolvemos URL pública para <audio src=...>
    const audioUrl = `/uploads/${relFile.replace(/\\/g, "/")}`;

    return res.json({
      ok: true,
      audioUrl,
      voice,
      style,
      // devolvemos también echo del texto por si UI lo necesita
      text,
    });
  } catch (err: any) {
    console.error("TTS generate error", err);
    return res
      .status(500)
      .json({ ok: false, message: "TTS generation failed" });
  }
});
