"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const isJpg = (name) => Boolean(name.match(/.*\.(jpg|JPG)$/m));
const findJpgs = (rootDir, skipDir = []) => {
    const files = fs_1.default.readdirSync(rootDir);
    const jpgs = files
        .filter((file) => isJpg(file))
        .map((file) => path_1.default.join(rootDir, file));
    const dirs = files.filter((file) => fs_1.default.statSync(path_1.default.join(rootDir, file)).isDirectory());
    const nextJpgs = dirs
        .filter((dir) => !skipDir.includes(dir))
        .map((dir) => findJpgs(path_1.default.join(rootDir, dir), skipDir));
    return [...jpgs, ...nextJpgs].flat();
};
const jpgs = findJpgs(".", ["node_modules"]);
console.log(jpgs);
// sharp("pics/hc2.JPG")
//   .resize(300,200)
//   .toFile("out.jpg", (err) => err && console.error(err));
