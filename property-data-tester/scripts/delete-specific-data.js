const { Pool } = require('pg');
require('dotenv').config();

// Connect to the database using the correct environment variable names
const pool = new Pool({
  host: process.env.PR_PG_HOST,
  port: parseInt(process.env.PR_PG_PORT || '5432'),
  database: process.env.PR_PG_DATABASE,
  user: process.env.PR_PG_USER,
  password: process.env.PR_PG_PASSWORD,
  ssl: process.env.PR_PG_SSL === 'require' ? { rejectUnauthorized: false } : false
});

async function deleteSpecificData() {
  const client = await pool.connect();
  
  try {
    console.log('Deleting specific data...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Delete property owner history records for the specific owner_id
    const deleteOwnerHistoryResult = await client.query(`
      DELETE FROM property_owner_history
      WHERE owner_id = 10410
      RETURNING history_id
    `);
    
    console.log(`Deleted ${deleteOwnerHistoryResult.rowCount} property owner history records for owner_id 10410`);
    
    // Delete the specific property owner
    const deleteOwnerResult = await client.query(`
      DELETE FROM property_owners
      WHERE owner_id = 10410
      RETURNING owner_id
    `);
    
    console.log(`Deleted ${deleteOwnerResult.rowCount} property owner with owner_id 10410`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Successfully deleted specific data');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error deleting data:', error);
    
    // If there's a foreign key constraint error, try to provide more information
    if (error.code === '23503') {
      console.error('Foreign key constraint error. This means some data is still referenced by other tables.');
      
      // Try to get more information about what's referencing the data
      try {
        const referencingData = await client.query(`
          SELECT * FROM property_owner_history WHERE owner_id = 10410
        `);
        
        console.error(`Found ${referencingData.rowCount} referencing records in property_owner_history:`);
        console.error(JSON.stringify(referencingData.rows, null, 2));
      } catch (infoError) {
        console.error('Could not get referencing data:', infoError);
      }
    }
  } finally {
    // Release client back to pool
    client.release();
    pool.end();
  }
}

// Run the script
console.time('Deletion time');
deleteSpecificData()
  .then(() => {
    console.timeEnd('Deletion time');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    console.timeEnd('Deletion time');
  });