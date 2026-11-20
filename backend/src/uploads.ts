import path from "path";

export function getUploadDirectory() {
  const configured = process.env.UPLOAD_DIR?.trim();
  // Keep uploads independent from the process working directory (which can vary by host).
  return configured ? path.resolve(configured) : path.resolve(__dirname, "../uploads");
}

export function getUploadedFilePath(publicPath: string) {
  const relativePath = publicPath.replace(/^\/+/, "");
  if (!relativePath.startsWith("uploads/")) {
    throw new Error("Invalid upload path");
  }
  const uploadRoot = getUploadDirectory();
  const filePath = path.resolve(uploadRoot, relativePath.slice("uploads/".length));
  if (filePath !== uploadRoot && !filePath.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error("Invalid upload path");
  }
  return filePath;
}
