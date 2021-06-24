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

const jpgs = findJpgs(".", ["node_modules"]);
console.log(jpgs);

// sharp("pics/hc2.JPG")
//   .resize(300,200)
//   .toFile("out.jpg", (err) => err && console.error(err));
