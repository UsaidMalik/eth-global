"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENSError = exports.BlockchainError = exports.FernError = void 0;
var FernError = /** @class */ (function (_super) {
    __extends(FernError, _super);
    function FernError(message, code) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.name = 'FernError';
        return _this;
    }
    return FernError;
}(Error));
exports.FernError = FernError;
var BlockchainError = /** @class */ (function (_super) {
    __extends(BlockchainError, _super);
    function BlockchainError(message, code) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.name = 'BlockchainError';
        return _this;
    }
    return BlockchainError;
}(Error));
exports.BlockchainError = BlockchainError;
var ENSError = /** @class */ (function (_super) {
    __extends(ENSError, _super);
    function ENSError(message, code) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.name = 'ENSError';
        return _this;
    }
    return ENSError;
}(Error));
exports.ENSError = ENSError;
