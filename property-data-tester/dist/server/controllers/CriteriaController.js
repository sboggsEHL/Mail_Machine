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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriteriaController = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Controller for serving criteria definition files
 */
class CriteriaController {
}
exports.CriteriaController = CriteriaController;
_a = CriteriaController;
/**
 * Get criteria definitions by category
 */
CriteriaController.getCriteriaByCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category } = req.params;
        console.log(`Received request for criteria category: ${category}`);
        // Validate category name (only alphanumeric and &)
        if (!/^[a-zA-Z0-9&]+$/.test(category)) {
            res.status(400).json({
                success: false,
                error: 'Invalid category name'
            });
            return;
        }
        // Path to criteria file
        const filePath = path_1.default.resolve(process.cwd(), 'docs/PropertyRadar', `criteria-${category}.json`);
        console.log(`Looking for file at: ${filePath}`);
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            res.status(404).json({
                success: false,
                error: `Criteria for category '${category}' not found`
            });
            return;
        }
        try {
            // Read file content
            const fileContent = fs_1.default.readFileSync(filePath, 'utf8');
            console.log(`File content length: ${fileContent.length} bytes`);
            // Parse the JSON to verify it's valid
            const jsonData = JSON.parse(fileContent);
            console.log(`Successfully parsed JSON for ${category}`);
            // Return the parsed data
            res.status(200).json(jsonData);
        }
        catch (error) {
            console.error(`Error parsing JSON for ${category}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({
                success: false,
                error: `Failed to parse criteria JSON: ${errorMessage}`
            });
        }
    }
    catch (error) {
        console.error('Error getting criteria:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get criteria definitions'
        });
    }
});
