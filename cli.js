"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
var metrics_1 = require("./metrics");
var fs = require("fs");
var readline = require("readline");
// Function to read URLs from the file
function readUrlsFromFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var fileStream, rl, urls, _a, rl_1, rl_1_1, line, e_1_1;
        var _b, e_1, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    fileStream = fs.createReadStream(filePath);
                    rl = readline.createInterface({
                        input: fileStream,
                        crlfDelay: Infinity
                    });
                    urls = [];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 6, 7, 12]);
                    _a = true, rl_1 = __asyncValues(rl);
                    _e.label = 2;
                case 2: return [4 /*yield*/, rl_1.next()];
                case 3:
                    if (!(rl_1_1 = _e.sent(), _b = rl_1_1.done, !_b)) return [3 /*break*/, 5];
                    _d = rl_1_1.value;
                    _a = false;
                    line = _d;
                    if (line.trim()) {
                        urls.push(line.trim()); // Add the URL if the line is not empty
                    }
                    _e.label = 4;
                case 4:
                    _a = true;
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 12];
                case 6:
                    e_1_1 = _e.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 12];
                case 7:
                    _e.trys.push([7, , 10, 11]);
                    if (!(!_a && !_b && (_c = rl_1.return))) return [3 /*break*/, 9];
                    return [4 /*yield*/, _c.call(rl_1)];
                case 8:
                    _e.sent();
                    _e.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 11: return [7 /*endfinally*/];
                case 12: return [2 /*return*/, urls];
            }
        });
    });
}
// Function to format and round the metrics, with NetScore at the end
var formatMetrics = function (url, metrics) { return ({
    URL: url,
    NetScore: parseFloat(metrics.score.toFixed(1)),
    NetScore_Latency: parseFloat(metrics.scoreLatency.toFixed(3)),
    RampUp: parseFloat(metrics.rampUpTimeValue.toFixed(1)),
    RampUp_Latency: parseFloat(metrics.rampUpTimeLatency.toFixed(3)),
    Correctness: parseFloat(metrics.correctnessValue.toFixed(1)),
    Correctness_Latency: parseFloat(metrics.correctnessLatency.toFixed(3)),
    BusFactor: parseFloat(metrics.busFactorValue.toFixed(1)),
    BusFactor_Latency: parseFloat(metrics.busFactorLatency.toFixed(3)),
    ResponsiveMaintainer: parseFloat(metrics.responsivenessValue.toFixed(1)),
    ResponsiveMaintainer_Latency: parseFloat(metrics.responsivenessLatency.toFixed(3)),
    License: parseFloat(metrics.licenseCompatabilityValue.toFixed(1)),
    License_Latency: parseFloat(metrics.licenseCompatabilityLatency.toFixed(3))
}); };
// Main function to read URLs, get metrics, and write them to NDJSON
function writeMetricsToFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var urls, outputFilePath, writeStream, _i, urls_1, url, metrics, formattedMetrics, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, readUrlsFromFile(filePath)];
                case 1:
                    urls = _a.sent();
                    outputFilePath = 'output.json';
                    writeStream = fs.createWriteStream(outputFilePath, { flags: 'a' });
                    _i = 0, urls_1 = urls;
                    _a.label = 2;
                case 2:
                    if (!(_i < urls_1.length)) return [3 /*break*/, 7];
                    url = urls_1[_i];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, (0, metrics_1.getRepoData)(url)];
                case 4:
                    metrics = _a.sent();
                    formattedMetrics = formatMetrics(url, metrics);
                    writeStream.write(JSON.stringify(formattedMetrics) + '\n');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error("Failed to fetch metrics for ".concat(url, ":"), error_1);
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7:
                    writeStream.end();
                    return [2 /*return*/];
            }
        });
    });
}
// Function to handle test mode
function Test() {
    console.log('Running in test mode...');
    // You can define test logic here
}
// Main function to validate input and run the script
function main() {
    var inputArg = process.argv[2];
    if (inputArg === 'test') {
        Test();
    }
    else if (fs.existsSync(inputArg)) {
        writeMetricsToFile(inputArg).catch(console.error);
    }
    else {
        console.error('Invalid command. Please provide a valid file path or use the word "test" as input.');
        process.exit(1);
    }
}
// Entry point of the script
main();
