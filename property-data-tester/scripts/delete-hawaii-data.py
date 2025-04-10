import psycopg2
import os
from dotenv import load_dotenv
import pytz

def cleanup_hawaii_records():
    # Load environment variables from .env
    load_dotenv()
    
    # Database connection parameters
    db_params = {
        'host': os.getenv('PR_PG_HOST'),
        'port': os.getenv('PR_PG_PORT'),
        'database': 'mailhaus',
        'user': os.getenv('PR_PG_USER'),
        'password': os.getenv('PR_PG_PASSWORD'),
        'sslmode': 'require'
    }
    
    try:
        # Connect to the database
        print("Connecting to database...")
        print(f"Host: {db_params['host']}")
        print(f"Database: {db_params['database']}")
        print(f"User: {db_params['user']}")
        
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()
        
        # First, identify all property_ids in Hawaii
        cur.execute("""
            SELECT property_id, radar_id, property_address, property_city, property_state
            FROM properties
            WHERE property_state = 'HI'
        """)
        
        hawaii_properties = cur.fetchall()
        
        if not hawaii_properties:
            print("\nNo properties found in Hawaii. Nothing to delete.")
            return
        
        hawaii_property_ids = [prop[0] for prop in hawaii_properties]
        
        # Show properties that will be deleted
        print(f"\nFound {len(hawaii_properties)} properties in Hawaii that will be deleted:")
        print("=" * 80)
        for prop in hawaii_properties:
            print(f"ID: {prop[0]}, RadarID: {prop[1]}, Address: {prop[2]}, {prop[3]}, {prop[4]}")
        
        # Count records in each table that will be deleted
        tables_and_counts = [
            # History Tables
            ('property_owner_history', 'property_id'),
            ('property_history', 'property_id'),
            ('loan_history', 'property_id'),
            # Child Tables
            ('mail_recipients', 'property_id'),
            ('loans', 'property_id'),
            ('property_owners', 'property_id'),
            # Parent Table
            ('properties', 'property_id')
        ]
        
        print("\nRecords that will be deleted:")
        print("=" * 50)
        records_exist = False
        
        for table, id_column in tables_and_counts:
            placeholders = ','.join(['%s'] * len(hawaii_property_ids))
            cur.execute(f"""
                SELECT COUNT(*) 
                FROM {table} 
                WHERE {id_column} IN ({placeholders})
            """, hawaii_property_ids)
            count = cur.fetchone()[0]
            print(f"{table:.<30} {count:>5} records")
            if count > 0:
                records_exist = True
        
        if not records_exist:
            print("\nNo related records found. Nothing to delete.")
            return
        
        # Ask for confirmation
        confirm = input("\nDo you want to proceed with deletion? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Cleanup cancelled.")
            return
        
        # Execute cleanup in correct order following the rules
        print("\nExecuting cleanup...")
        
        # Prepare placeholders for the IN clause
        placeholders = ','.join(['%s'] * len(hawaii_property_ids))
        
        # 1. Delete History Tables first
        cur.execute(f"""
            DELETE FROM property_owner_history 
            WHERE property_id IN ({placeholders})
        """, hawaii_property_ids)
        print(f"Deleted {cur.rowcount} records from property_owner_history")
        
        cur.execute(f"""
            DELETE FROM property_history 
            WHERE property_id IN ({placeholders})
        """, hawaii_property_ids)
        print(f"Deleted {cur.rowcount} records from property_history")
        
        cur.execute(f"""
            DELETE FROM loan_history 
            WHERE property_id IN ({placeholders})
        """, hawaii_property_ids)
        print(f"Deleted {cur.rowcount} records from loan_history")
        
        # 2. Delete Child Tables in order
        # First mail_recipients (since it references both loans and property_owners)
        cur.execute(f"""
            DELETE FROM mail_recipients 
            WHERE property_id IN ({placeholders})
        """, hawaii_property_ids)
        print(f"Deleted {cur.rowcount} records from mail_recipients")
        
        # Then loans
        cur.execute(f"""
            DELETE FROM loans 
            WHERE property_id IN ({placeholders})
        """, hawaii_property_ids)
        print(f"Deleted {cur.rowcount} records from loans")
        
        # Then property_owners (with trigger handling)
        cur.execute("ALTER TABLE property_owners DISABLE TRIGGER track_property_owner_changes")
        cur.execute(f"""
            DELETE FROM property_owners 
            WHERE property_id IN ({placeholders})
        """, hawaii_property_ids)
        print(f"Deleted {cur.rowcount} records from property_owners")
        cur.execute("ALTER TABLE property_owners ENABLE TRIGGER track_property_owner_changes")
        
        # 3. Delete Parent Table (with trigger handling)
        cur.execute("ALTER TABLE properties DISABLE TRIGGER track_property_changes")
        cur.execute(f"""
            DELETE FROM properties 
            WHERE property_id IN ({placeholders})
        """, hawaii_property_ids)
        print(f"Deleted {cur.rowcount} records from properties")
        cur.execute("ALTER TABLE properties ENABLE TRIGGER track_property_changes")
        
        # Ask for confirmation to commit
        confirm = input("\nDo you want to commit these changes? (yes/no): ")
        if confirm.lower() == 'yes':
            conn.commit()
            print("Changes committed successfully!")
        else:
            conn.rollback()
            print("Changes rolled back.")
        
        # Show final counts
        print("\nFinal record counts:")
        print("=" * 50)
        for table, id_column in tables_and_counts:
            if hawaii_property_ids:
                placeholders = ','.join(['%s'] * len(hawaii_property_ids))
                cur.execute(f"""
                    SELECT COUNT(*) 
                    FROM {table} 
                    WHERE {id_column} IN ({placeholders})
                """, hawaii_property_ids)
                count = cur.fetchone()[0]
                print(f"{table:.<30} {count:>5} records remaining")
        
    except Exception as e:
        print(f"\nError during cleanup: {str(e)}")
        if 'conn' in locals():
            print("Rolling back transaction...")
            conn.rollback()
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()
            print("\nDatabase connection closed.")

if __name__ == "__main__":
    cleanup_hawaii_records()
