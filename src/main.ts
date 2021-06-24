import sharp from "sharp";
import fs from "fs";
import path from "path";

const isJpg = (name: string): boolean => Boolean(name.match(/.*\.(jpg|JPG)$/m));

const findJpgs = (rootDir: string, skipDir: string[] = []): string[] => {
  const files = fs.readdirSync(rootDir);
  const jpgs = files
    .filter((file) => isJpg(file))
    .map((file) => path.join(rootDir, file));
  const dirs = files.filter((file) =>
    fs.statSync(path.join(rootDir, file)).isDirectory()
  );
  const nextJpgs = dirs
    .filter((dir) => !skipDir.includes(dir))
    .map((dir) => findJpgs(path.join(rootDir, dir), skipDir));
  return [...jpgs, ...nextJpgs].flat();
};

const createDirPath = (dirPath: string): string[] => {
  const outPath = [...dirPath.split("/")];
  let currentDir = "";
  for (let i = 0; i < outPath.length - 1; i++) {
    currentDir += outPath[i];
    currentDir += "/";
    mkDir(currentDir);
  }
  return outPath;
};

const mkDir = (dir: string) => !fs.existsSync(dir) && fs.mkdirSync(dir);

function main() {
  const output = "out";
  // 4:3
  const width = 500;
  const height = 375;

  mkDir(output);

  findJpgs(".", ["node_modules", "out"]).forEach(async (jpg) => {
    const outPath = createDirPath(`${output}/${jpg}`);
    console.time(jpg);
    try {
      await sharp(jpg)
        .resize({ width, height, fit: "contain", background: "#444"})
        .normalise()
        .toFile(path.join(...outPath));
    } catch (err) {
      console.error(err);
    }
    console.timeLog(jpg);
  });
}

main();
