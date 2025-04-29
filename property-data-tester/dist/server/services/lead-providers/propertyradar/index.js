"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPropertyRadarProvider = exports.types = exports.PropertyRadarCriteriaMapper = exports.PropertyRadarProvider = void 0;
const PropertyRadarProvider_1 = require("./PropertyRadarProvider");
Object.defineProperty(exports, "PropertyRadarProvider", { enumerable: true, get: function () { return PropertyRadarProvider_1.PropertyRadarProvider; } });
const PropertyRadarCriteriaMapper_1 = require("./PropertyRadarCriteriaMapper");
Object.defineProperty(exports, "PropertyRadarCriteriaMapper", { enumerable: true, get: function () { return PropertyRadarCriteriaMapper_1.PropertyRadarCriteriaMapper; } });
const types = __importStar(require("./types"));
exports.types = types;
/**
 * Create and configure a PropertyRadar provider instance
 * @param apiToken The API token for PropertyRadar
 * @returns Configured PropertyRadar provider
 */
function createPropertyRadarProvider(apiToken) {
    return new PropertyRadarProvider_1.PropertyRadarProvider(apiToken);
}
exports.createPropertyRadarProvider = createPropertyRadarProvider;
