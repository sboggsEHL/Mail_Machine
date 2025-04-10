const fs = require('fs');

// Define batch files to check
const batchFiles = [
  'property-data-tester/logs/property_payloads/2025-04/16_batch1_2025-04-02193406698.json',
  'property-data-tester/logs/property_payloads/2025-04/18_batch1_2025-04-02195710635.json',
  'property-data-tester/logs/property_payloads/2025-04/18_batch2_2025-04-02200013998.json',
  'property-data-tester/logs/property_payloads/2025-04/18_batch3_2025-04-02200141693.json',
  'property-data-tester/logs/property_payloads/2025-04/21_batch1_2025-04-02210411103.json',
  'property-data-tester/logs/property_payloads/2025-04/22_batch1_2025-04-02211543963.json'
];

// Load all batch files
const batchData = [];
for (const file of batchFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(file));
    batchData.push({
      file: file.split('/').pop(),
      data: data,
      ids: data.map(p => p.RadarID)
    });
    console.log(`Loaded ${data.length} properties from ${file.split('/').pop()}`);
  } catch (error) {
    console.error(`Error loading ${file}: ${error.message}`);
  }
}

// Check for duplicates within each batch
console.log("\n=== Checking for duplicates within each batch ===");
for (const batch of batchData) {
  const uniqueIds = new Set(batch.ids);
  console.log(`${batch.file}: ${batch.ids.length} total, ${uniqueIds.size} unique, ${batch.ids.length - uniqueIds.size} duplicates`);
}

// Check for overlap between batches
console.log("\n=== Checking for overlap between batches ===");
for (let i = 0; i < batchData.length; i++) {
  for (let j = i + 1; j < batchData.length; j++) {
    const batch1 = batchData[i];
    const batch2 = batchData[j];
    
    // Find overlap
    const overlap = batch1.ids.filter(id => batch2.ids.includes(id));
    
    console.log(`${batch1.file} vs ${batch2.file}: ${overlap.length} overlapping properties`);
  }
}

// Check if skipping batch 18 would miss properties
console.log("\n=== Impact of skipping batch 18 ===");
const batch18Files = batchData.filter(b => b.file.startsWith('18_batch'));
const otherBatches = batchData.filter(b => !b.file.startsWith('18_batch'));

// Combine all IDs from batch 18
const batch18Ids = new Set();
for (const batch of batch18Files) {
  batch.ids.forEach(id => batch18Ids.add(id));
}

// Combine all IDs from other batches
const otherBatchIds = new Set();
for (const batch of otherBatches) {
  batch.ids.forEach(id => otherBatchIds.add(id));
}

// Find unique IDs in batch 18
const uniqueInBatch18 = [...batch18Ids].filter(id => !otherBatchIds.has(id));

console.log(`Total properties in batch 18: ${batch18Ids.size}`);
console.log(`Properties unique to batch 18 (not in other batches): ${uniqueInBatch18.length}`);
console.log(`Percentage of batch 18 that would be missed: ${(uniqueInBatch18.length / batch18Ids.size * 100).toFixed(2)}%`);
