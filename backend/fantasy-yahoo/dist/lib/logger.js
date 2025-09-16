"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logToFile = logToFile;
exports.clearLogFile = clearLogFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_FILE = path_1.default.join(process.cwd(), 'debug.log');
function logToFile(label, data) {
    const timestamp = new Date().toISOString();
    const logEntry = `\n=== ${label} (${timestamp}) ===\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n`;
    try {
        fs_1.default.appendFileSync(LOG_FILE, logEntry);
    }
    catch { }
}
function clearLogFile() {
    try {
        fs_1.default.writeFileSync(LOG_FILE, `=== Yahoo Fantasy API Debug Log ===\nCleared at: ${new Date().toISOString()}\n`);
    }
    catch { }
}
