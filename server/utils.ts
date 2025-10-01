import express from "express";
import fs from "fs";
import path from "path";

export function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  console.log(`${formattedTime} [express] ${message}`);
}

export function serveStatic(app: express.Express) {
  const distPath = path.resolve(process.cwd(), "dist/public");
  
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find dist folder at ${distPath}`);
  }

  app.use(express.static(distPath));
  
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
