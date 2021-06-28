#!/usr/bin/env node
import sharp from "sharp";
import fs from "fs";
import path from "path";
import os from "os";
import minimist from "minimist";

const isJpg = (name: string): boolean => Boolean(name.match(/.*\.(jpg|JPG)$/m));

/**
 * Find all jpg files in the root directory
 * @param rootDir
 * @param skipDir directories to skip
 * @returns
 */
const findJpgs = (
  rootDir: string,
  skipDir: string[] = [],
  recursive = false
): string[] => {
  const files = fs.readdirSync(rootDir);
  const jpgs = files
    .filter((file) => isJpg(file))
    .map((file) => path.join(rootDir, file));
  if (!recursive) return jpgs;

  const nextJpgs = files
    .filter((file) => fs.statSync(path.join(rootDir, file)).isDirectory())
    .filter((dir) => !skipDir.includes(dir))
    .map((dir) => findJpgs(path.join(rootDir, dir), skipDir))
    .flat();
  return [...jpgs, ...nextJpgs];
};

/**
 * create folders in the specified path name
 * @param dirPath
 * @returns
 */
const createDirPath = (...dirPath: string[]): void =>
  dirPath.forEach(
    (_, i, arr) => i < arr.length - 1 && mkDir(path.join(...dirPath))
  );

/**
 * make a directory if it doesn't exist
 * @param dir directory path
 * @returns
 */
const mkDir = (dir: string) => !fs.existsSync(dir) && fs.mkdirSync(dir);

export interface Config {
  width: number;
  height: number;
  aspectRatio: number;
  ratioUseHeight: boolean;
  ratioUseWidth: boolean;
  background: string;
  omitDir: string[];
}

const defaultConfig: Config = {
  width: 500,
  height: 500,
  aspectRatio: 4 / 3,
  ratioUseHeight: false,
  ratioUseWidth: true,
  background: "#fff",
  omitDir: [],
};

function main() {
  // get the config file
  const configFile = path.join(
    os.homedir(),
    ".config",
    "img-diff",
    "config.json"
  );
  if (!fs.existsSync(configFile)) {
    createDirPath(os.homedir(), ".config", "img-diff");
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig));
  }

  let config: Config = { ...defaultConfig, ...require(configFile) };

  // validate config
  if (config.ratioUseHeight && config.ratioUseWidth)
    throw new Error(
      "Only one direction can be used to scale the aspect ratio."
    );

  if (config.ratioUseHeight)
    config.width = Math.floor(config.height * config.aspectRatio);
  if (config.ratioUseWidth)
    config.height = Math.floor(config.width * (1 / config.aspectRatio));

  // entry

  const argv = minimist(process.argv.slice(2));
  if (!argv.o) throw new Error("use -o to specify an output directory");
  const outDir = path.join(process.cwd(), argv.o);
  if (!argv.i) throw new Error("use -i to specify an input directory");
  const inDir = path.join(process.cwd(), argv.i);
  const recursive = Boolean(argv.r);

  mkDir(outDir);

  findJpgs(inDir, config.omitDir, recursive).forEach(async (jpg) => {
    const jpgName = jpg.replace(inDir, "");
    const jpgOutDir = outDir.split("/");
    createDirPath("/", ...jpgOutDir);

    console.time(jpg);
    try {
      await sharp(jpg)
        .resize({
          width: config.width,
          height: config.height,
          fit: "contain",
          background: config.background,
        })
        .normalise()
        .toFile(path.join("/", ...jpgOutDir, jpgName));
    } catch (err) {
      console.error(err);
    }
    console.timeLog(jpg);
  });
}
try {
  main();
} catch (error) {
  console.error(error.message);
}
