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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SepoliaENSResolver = void 0;
var errors_1 = require("../types/errors");
var ethers_1 = require("ethers");
var dotenv = require("dotenv");
dotenv.config();
var SepoliaENSResolver = /** @class */ (function () {
    function SepoliaENSResolver() {
    }
    SepoliaENSResolver.prototype.validateENSName = function (ensName) {
        var ensRegex = /^[a-zA-Z0-9-]+\.eth$/;
        if (!ensRegex.test(ensName))
            return false;
        if (ensName.length < 5 || ensName.length > 255)
            return false;
        var name = ensName.replace('.eth', '');
        if (name.startsWith('-') || name.endsWith('-'))
            return false;
        if (name.includes('--'))
            return false;
        return true;
    };
    SepoliaENSResolver.prototype.validateEthereumAddress = function (address) {
        return ethers_1.ethers.isAddress(address);
    };
    SepoliaENSResolver.prototype.resolveENS = function (ensName) {
        return __awaiter(this, void 0, void 0, function () {
            var address, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!ensName) {
                            throw new errors_1.ENSError('ENS name cannot be empty', 'INVALID_ENS_NAME');
                        }
                        if (!this.validateENSName(ensName)) {
                            throw new errors_1.ENSError("Invalid ENS name format: ".concat(ensName), 'INVALID_ENS_NAME');
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, SepoliaENSResolver.provider.resolveName(ensName)];
                    case 2:
                        address = _a.sent();
                        return [2 /*return*/, address !== null && address !== void 0 ? address : null];
                    case 3:
                        err_1 = _a.sent();
                        throw new errors_1.ENSError("Failed to resolve ENS: ".concat(err_1.message), 'RESOLVER_UNAVAILABLE');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SepoliaENSResolver.prototype.reverseResolve = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            var ensName, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.validateEthereumAddress(address)) {
                            throw new errors_1.ENSError("Invalid Ethereum address format: ".concat(address), 'INVALID_ADDRESS');
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, SepoliaENSResolver.provider.lookupAddress(address)];
                    case 2:
                        ensName = _a.sent();
                        return [2 /*return*/, ensName !== null && ensName !== void 0 ? ensName : null];
                    case 3:
                        err_2 = _a.sent();
                        throw new errors_1.ENSError("Failed reverse resolution: ".concat(err_2.message), 'RESOLVER_UNAVAILABLE');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SepoliaENSResolver.provider = new ethers_1.ethers.JsonRpcProvider("https://sepolia.infura.io/v3/".concat(process.env.INFURA_API_KEY));
    return SepoliaENSResolver;
}());
exports.SepoliaENSResolver = SepoliaENSResolver;
var resolver = new SepoliaENSResolver();
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var address, ens, err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, resolver.resolveENS("usaid.eth")];
            case 1:
                address = _a.sent();
                console.log("Resolved ENS →", address);
                return [4 /*yield*/, resolver.reverseResolve("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")];
            case 2:
                ens = _a.sent();
                console.log("Reverse ENS →", ens);
                return [3 /*break*/, 4];
            case 3:
                err_3 = _a.sent();
                console.error("Error:", err_3);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); })();
