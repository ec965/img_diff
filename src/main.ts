import sharp from "sharp";
import fs from "fs";
import path from "path";
import minimist from "minimist";

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
    .map((dir) => findJpgs(path.join(rootDir, dir), skipDir))
    .flat();
  return [...jpgs, ...nextJpgs];
};

const createDirPath = (dirPath: string): string[] => {
  const outPath = [...dirPath.split("/")];
  let currentDir = "";
  outPath
    .filter((_, i, arr) => i < arr.length - 1)
    .forEach((currPath) => {
      currentDir += currPath + "/";
      mkDir(currentDir);
    });
  return outPath;
};

const mkDir = (dir: string) => !fs.existsSync(dir) && fs.mkdirSync(dir);

const argv = minimist(process.argv.slice(2));
// entry
const output = "out";
// 4:3
const width = argv.w ?? 500;
const height = width * (3 / 4);
const background = argv.b ?? "#ffffff";

mkDir(output);

findJpgs(".", ["node_modules", "out"]).forEach(async (jpg) => {
  const outPath = createDirPath(`${output}/${jpg}`);
  console.time(jpg);
  try {
    await sharp(jpg)
      .resize({ width, height, fit: "contain", background })
      .normalise()
      .toFile(path.join(...outPath));
  } catch (err) {
    console.error(err);
  }
  console.timeLog(jpg);
});
