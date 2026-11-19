import path from "path";

export function getUploadDirectory() {
  const configured = process.env.UPLOAD_DIR?.trim();
  return configured ? path.resolve(configured) : path.resolve(process.cwd(), "uploads");
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
