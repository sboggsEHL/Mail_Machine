import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * Controller for serving criteria definition files
 */
export class CriteriaController {
  /**
   * Get criteria definitions by category
   */
  public static getCriteriaByCategory = async (req: Request, res: Response): Promise<void> => {
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
      const filePath = path.resolve(process.cwd(), 'docs/PropertyRadar', `criteria-${category}.json`);
      console.log(`Looking for file at: ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        res.status(404).json({
          success: false,
          error: `Criteria for category '${category}' not found`
        });
        return;
      }
      
      try {
        // Read file content
        const fileContent = fs.readFileSync(filePath, 'utf8');
        console.log(`File content length: ${fileContent.length} bytes`);
        
        // Parse the JSON to verify it's valid
        const jsonData = JSON.parse(fileContent);
        console.log(`Successfully parsed JSON for ${category}`);
        
        // Return the parsed data
        res.status(200).json(jsonData);
      } catch (error) {
        console.error(`Error parsing JSON for ${category}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({
          success: false,
          error: `Failed to parse criteria JSON: ${errorMessage}`
        });
      }
    } catch (error) {
      console.error('Error getting criteria:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get criteria definitions'
      });
    }
  };
}
