# Raw Payload Storage Implementation Plan

## Overview

This document outlines the changes needed to implement raw payload storage for individual property API calls, similar to how the batch system works.

## Required Changes

### 1. Modify PropertyService.ts

```typescript
// Add import for PropertyPayloadService
import { PropertyPayloadService } from './PropertyPayloadService';

export class PropertyService {
  // Add PropertyPayloadService as a class property
  private propertyRepo: PropertyRepository;
  private ownerRepo: PropertyOwnerRepository;
  private loanRepo: LoanRepository;
  private pool: Pool;
  private propertyPayloadService: PropertyPayloadService;
  private batchCounter: Map<string, number> = new Map();

  // Update constructor to accept PropertyPayloadService
  constructor(
    pool: Pool,
    propertyRepo?: PropertyRepository,
    ownerRepo?: PropertyOwnerRepository,
    loanRepo?: LoanRepository,
    propertyPayloadService?: PropertyPayloadService
  ) {
    this.pool = pool;
    this.propertyRepo = propertyRepo || new PropertyRepository(pool);
    this.ownerRepo = ownerRepo || new PropertyOwnerRepository(pool);
    this.loanRepo = loanRepo || new LoanRepository(pool);
    this.propertyPayloadService = propertyPayloadService || new PropertyPayloadService(pool);
  }

  // Update fetchPropertiesFromProvider method to save raw payloads
  async fetchPropertiesFromProvider(
    providerCode: string,
    criteria: any,
    fields: string[],
    campaignId: string = 'individual-request'
  ): Promise<any[]> {
    const provider = leadProviderFactory.getProvider(providerCode);
    
    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerCode} is not properly configured.`);
    }
    
    // Fetch properties from provider
    const properties = await provider.fetchProperties(criteria, fields);
    
    // Save raw payload to file
    if (properties.length > 0) {
      try {
        // Get batch number for this campaign
        const batchNumber = this.getNextBatchNumber(campaignId);
        
        // Save properties to file
        await this.propertyPayloadService.savePropertyPayload(
          properties,
          campaignId,
          batchNumber
        );
        
        console.log(`Saved raw payload for ${properties.length} properties from individual request`);
      } catch (error) {
        console.error('Error saving raw payload:', error);
        // Continue even if saving the payload fails
      }
    }
    
    return properties;
  }

  // Add helper method for batch number generation
  private getNextBatchNumber(campaignId: string): number {
    const currentBatchNumber = this.batchCounter.get(campaignId) || 0;
    const nextBatchNumber = currentBatchNumber + 1;
    this.batchCounter.set(campaignId, nextBatchNumber);
    return nextBatchNumber;
  }

  // Rest of the class remains unchanged
}
```

### 2. Update PropertyController.ts (Optional)

If you want to allow specifying a campaign ID from the client:

```typescript
fetchProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fields, limit, start, criteria, campaignId } = req.body;
    
    // ... existing validation code ...
    
    const properties = await this.propertyService.fetchPropertiesFromProvider(
      'PR', // PropertyRadar provider code
      criteriaInput,
      fields,
      campaignId || 'individual-request' // Pass campaign ID if provided
    );
    
    // ... rest of the method remains the same
  } catch (error) {
    // ... error handling ...
  }
};
```

### 3. Update property.routes.ts

```typescript
export function createPropertyRoutes(): Router {
  const router = Router();
  const propertyPayloadService = new PropertyPayloadService(dbPool);
  const propertyService = new PropertyService(
    dbPool, 
    undefined, 
    undefined, 
    undefined, 
    propertyPayloadService
  );
  const propertyController = new PropertyController(propertyService);
  
  // ... route definitions remain the same
  
  return router;
}
```

## Implementation Steps

1. Switch to Code mode
2. Implement the changes to PropertyService.ts
3. Update property.routes.ts
4. Optionally update PropertyController.ts if you want to allow specifying a campaign ID
5. Test the changes by making an individual property API call
6. Verify that the raw payload is saved to a file in the logs/property_payloads directory

## Testing

After implementing the changes, you can test them by:

1. Making an API call to fetch a single property
2. Checking the logs/property_payloads directory for a new file
3. Verifying that the file contains the raw property data
4. Checking the batch_file_status table for a new record