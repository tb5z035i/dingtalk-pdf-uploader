const fs = require("node:fs");
const path = require("node:path");

const publicDir = path.join(__dirname, "..", "public");
const distDir = path.join(__dirname, "..", "dist");

fs.cpSync(publicDir, distDir, { recursive: true });
