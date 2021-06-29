#!/usr/bin/env node
import sharp from "sharp";
import fs from "fs";
import path from "path";
import os from "os";
import minimist from "minimist";

const isJpg = (name: string): boolean =>
  Boolean(name.match(/.*\.(jpg|JPG|png|PNG)$/m));

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

const printHelp = () =>
  console.log(`
  -i input dir
  -o output dir
  -r recursive
  -w width
  -h height
  -a aspect ratio
  -b background for resize contain
  -r resize type
  `);

const removeUndefKeys = (obj: any) =>
  Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);

export interface Config {
  width?: number;
  height?: number;
  aspectRatio?: number;
  background?: string;
  omitDir?: string[];
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

const defaultConfig: Config = {
  width: 500,
  aspectRatio: 4 / 3,
  background: "#fff",
  omitDir: [],
  fit: "inside",
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

  const argv = minimist(process.argv.slice(2));
  if (argv.h || argv.help) return printHelp();
  const outDir = path.join(process.cwd(), argv.o || "out");
  const inDir = path.join(process.cwd(), argv.i || ""); // defaults to current path
  const recursive = Boolean(argv.r);

  const argvConfig: Config = {
    width: argv.w,
    height: argv.h,
    aspectRatio: argv.a,
    background: argv.b,
    fit: argv.f,
  };

  /* eslint-disable @typescript-eslint/no-var-requires */
  const fileConfig = require(configFile);

  removeUndefKeys(fileConfig);
  removeUndefKeys(argvConfig);

  const config: Config = {
    ...defaultConfig,
    ...require(configFile),
    ...argvConfig,
  };

  // validate config
  if (config.aspectRatio && config.width && config.height)
    throw new Error(
      "Aspect ratio cannot be defined while using both width and height."
    );
  if (config.aspectRatio && config.height)
    config.width = Math.floor(config.height * config.aspectRatio);
  if (config.aspectRatio && config.width)
    config.height = Math.floor(config.width * (1 / config.aspectRatio));

  // entry
  mkDir(outDir);

  findJpgs(inDir, config.omitDir, recursive).forEach(async (jpg) => {
    const jpgInDir = jpg.replace(inDir, "").split(path.sep);
    const jpgName = jpgInDir.pop();
    const jpgOutDir = [path.sep, ...outDir.split(path.sep), ...jpgInDir];

    createDirPath(...jpgOutDir);

    console.time(jpg);
    try {
      await sharp(jpg)
        .resize({
          width: config.width,
          height: config.height,
          fit: config.fit,
          background: config.background,
        })
        .normalise()
        .toFile(path.join(...jpgOutDir, jpgName as string));
    } catch (err) {
      console.error(err);
    }
    console.timeLog(jpg);
  });
}
try {
  main();
} catch (error) {
  printHelp();
  console.error(error);
}
