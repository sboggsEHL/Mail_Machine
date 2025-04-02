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

async function deleteDataFromToday() {
  const client = await pool.connect();
  
  try {
    console.log('Deleting data inserted today...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    console.log(`Deleting data from ${today}`);
    
    // Delete loans for properties created today
    const deleteLoansResult = await client.query(`
      DELETE FROM loans
      WHERE property_id IN (
        SELECT property_id
        FROM properties
        WHERE DATE(created_at) = $1
      )
      RETURNING loan_id
    `, [today]);
    
    console.log(`Deleted ${deleteLoansResult.rowCount} loans`);
    
    // Delete property owner history records for owners of properties created today
    const deleteOwnerHistoryResult = await client.query(`
      DELETE FROM property_owner_history
      WHERE owner_id IN (
        SELECT owner_id
        FROM property_owners
        WHERE property_id IN (
          SELECT property_id
          FROM properties
          WHERE DATE(created_at) = $1
        )
      )
      RETURNING history_id
    `, [today]);
    
    console.log(`Deleted ${deleteOwnerHistoryResult.rowCount} property owner history records`);
    
    // Delete property owners for properties created today
    const deleteOwnersResult = await client.query(`
      DELETE FROM property_owners
      WHERE property_id IN (
        SELECT property_id
        FROM properties
        WHERE DATE(created_at) = $1
      )
      RETURNING owner_id
    `, [today]);
    
    console.log(`Deleted ${deleteOwnersResult.rowCount} property owners`);
    
    // Delete properties created today
    const deletePropertiesResult = await client.query(`
      DELETE FROM properties
      WHERE DATE(created_at) = $1
      RETURNING property_id
    `, [today]);
    
    console.log(`Deleted ${deletePropertiesResult.rowCount} properties`);
    
    // Delete batch file status records created today
    const deleteBatchFileStatusResult = await client.query(`
      DELETE FROM batch_file_status
      WHERE DATE(created_at) = $1
      RETURNING file_id
    `, [today]);
    
    console.log(`Deleted ${deleteBatchFileStatusResult.rowCount} batch file status records`);
    
    // Delete batch jobs created today
    const deleteBatchJobsResult = await client.query(`
      DELETE FROM batch_jobs
      WHERE DATE(created_at) = $1
      RETURNING job_id
    `, [today]);
    
    console.log(`Deleted ${deleteBatchJobsResult.rowCount} batch jobs`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Successfully deleted all data inserted today');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error deleting data:', error);
    
    // If there's a foreign key constraint error, try to provide more information
    if (error.code === '23503') {
      console.error('Foreign key constraint error. This means some data is still referenced by other tables.');
      console.error('You may need to manually delete data from these tables first.');
      
      // Try to get more information about the constraint
      try {
        const constraintInfo = await client.query(`
          SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_name = $1
        `, [error.constraint]);
        
        if (constraintInfo.rows.length > 0) {
          const info = constraintInfo.rows[0];
          console.error(`Constraint: ${info.constraint_name}`);
          console.error(`Table: ${info.table_name}, Column: ${info.column_name}`);
          console.error(`Referenced Table: ${info.foreign_table_name}, Column: ${info.foreign_column_name}`);
        }
      } catch (infoError) {
        console.error('Could not get constraint information:', infoError);
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
deleteDataFromToday()
  .then(() => {
    console.timeEnd('Deletion time');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    console.timeEnd('Deletion time');
  });