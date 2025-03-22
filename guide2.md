## Step 17: Create a Master Archival Function

**What we're doing:** Creating a function to run all archival processes.

**Why:** This simplifies scheduling by providing a single entry point.

```sql
CREATE OR REPLACE FUNCTION run_all_archival_processes()
RETURNS VOID AS $$
DECLARE
    v_property_history_months INTEGER := 12; -- Default to 12 months
    v_property_owner_history_months INTEGER := 12;
    v_loan_history_months INTEGER := 12;
    v_processing_logs_months INTEGER := 6;
BEGIN
    -- Run archival processes
    PERFORM archive_property_history(v_property_history_months);
    PERFORM archive_property_owner_history(v_property_owner_history_months);
    PERFORM archive_loan_history(v_loan_history_months);
    PERFORM archive_processing_logs(v_processing_logs_months);
    
    -- Log the archival
    INSERT INTO processing_logs(
        log_level,
        component,
        message
    ) VALUES (
        'INFO',
        'DATA_ARCHIVAL',
        'Ran all archival processes'
    );
END;
$$ LANGUAGE plpgsql;
```

**Expected outcome:** You now have a master function to run all archival processes, which you can call from a cron job.

## How to Use This Database in Practice

### Example 1: Adding a New Property with Multiple Owners

```sql
-- Insert a property
INSERT INTO properties (
    provider_id,
    radar_id,
    property_address,
    property_city,
    property_state,
    property_zip,
    property_type,
    county,
    apn,
    year_built,
    ownership_type,
    is_owner_occupied,
    avm,
    available_equity,
    equity_percent,
    annual_taxes
) VALUES (
    1, -- PropertyRadar provider_id
    'P12345',
    '123 Main St',
    'Los Angeles',
    'CA',
    '90001',
    'Single Family',
    'Los Angeles',
    '1234-567-890',
    1985,
    'JOINT',
    TRUE,
    500000,
    120000,
    24,
    5000
);

-- Get the property_id
SELECT property_id FROM properties WHERE radar_id = 'P12345';

-- Insert primary owner
INSERT INTO property_owners (
    property_id,
    first_name,
    last_name,
    full_name,
    email,
    phone,
    owner_type,
    ownership_percentage,
    is_primary_contact,
    phone_availability,
    email_availability
) VALUES (
    1, -- Use the property_id from the previous query
    'John',
    'Smith',
    'John Smith',
    'john.smith@example.com',
    '555-123-4567',
    'PRIMARY',
    50,
    TRUE,
    TRUE,
    TRUE
);

-- Insert co-owner
INSERT INTO property_owners (
    property_id,
    first_name,
    last_name,
    full_name,
    email,
    phone,
    owner_type,
    ownership_percentage,
    is_primary_contact,
    phone_availability,
    email_availability
) VALUES (
    1, -- Use the property_id from the previous query
    'Jane',
    'Smith',
    'Jane Smith',
    'jane.smith@example.com',
    '555-123-4568',
    'SPOUSE',
    50,
    FALSE,
    TRUE,
    TRUE
);

-- Insert a loan (loan_id will be generated automatically)
INSERT INTO loans (
    property_id,
    loan_type,
    loan_purpose,
    loan_amount,
    loan_balance,
    interest_rate,
    term_years,
    loan_position,
    rate_type,
    lender_name,
    origination_date,
    maturity_date,
    equity_amount,
    equity_percentage
) VALUES (
    1, -- Use the property_id from the previous query
    'VA',
    'Purchase',
    400000,
    380000,
    4.5,
    30,
    1,
    'FIXED',
    'ABC Mortgage',
    '2020-01-15',
    '2050-01-15',
    120000,
    24
);
```

### Example 2: Creating a Mail Campaign

```sql
-- Create a campaign
INSERT INTO mail_campaigns (
    campaign_name,
    description,
    campaign_date,
    target_loan_types,
    target_states
) VALUES (
    'VA Loans California April 2025',
    'VA loans in California for April 2025 campaign',
    '2025-04-15',
    ARRAY['VA'],
    ARRAY['CA']
);

-- Select recipients
INSERT INTO mail_recipients (
    campaign_id,
    property_id,
    loan_id,
    owner_id,
    first_name,
    last_name,
    address,
    city,
    state,
    zip_code,
    city_state_zip
)
SELECT 
    1, -- campaign_id
    p.property_id,
    l.loan_id,
    po.owner_id,
    po.first_name,
    po.last_name,
    p.property_address,
    p.property_city,
    p.property_state,
    p.property_zip,
    p.property_city || ', ' || p.property_state || ' ' || p.property_zip
FROM 
    properties p
JOIN 
    loans l ON p.property_id = l.property_id
JOIN
    property_owners po ON p.property_id = po.property_id AND po.is_primary_contact = TRUE
WHERE 
    l.loan_type = 'VA'
    AND p.property_state = 'CA'
    AND NOT EXISTS (
        SELECT 1 FROM dnm_registry 
        WHERE (property_id = p.property_id OR loan_id = l.loan_id)
        AND is_active = TRUE
    );

-- Calculate mail dates
UPDATE mail_recipients mr
SET 
    (close_month, skip_month, next_pay_month, mail_date, phone_number) = 
    (SELECT close_month, skip_month, next_pay_month, mail_date, phone_number 
     FROM calculate_mail_dates())
WHERE 
    campaign_id = 1;

-- Copy to mailready table
INSERT INTO mailready (
    first_name, last_name, loan_id, address, city_state_zip,
    lender, loan_type, balance, close_month, skip_month, 
    next_pay_month, mail_date, phone_number, city, recipient_id
)
SELECT 
    mr.first_name, mr.last_name, mr.loan_id, mr.address, mr.city_state_zip,
    l.lender_name, l.loan_type, l.loan_balance, mr.close_month, mr.skip_month,
    mr.next_pay_month, mr.mail_date, mr.phone_number, mr.city, mr.recipient_id
FROM 
    mail_recipients mr
JOIN 
    loans l ON mr.loan_id = l.loan_id
WHERE 
    mr.campaign_id = 1;
```

### Example 3: Looking Up a Property by Loan ID

```sql
-- When a customer calls with a loan ID, use the complete_property_view
SELECT * FROM complete_property_view WHERE loan_id = 'VCA2512-00001';
```

This query gives your loan officers EVERYTHING they need to know about the property, loan, mailing history, and DNM status - all in one query!

### Example 4: Adding to DNM Registry

```sql
-- When a customer asks to be removed from mailings
INSERT INTO dnm_registry (
    property_id,
    loan_id,
    reason,
    reason_category,
    source,
    blocked_by,
    notes
) VALUES (
    (SELECT property_id FROM loans WHERE loan_id = 'VCA2512-00001'),
    'VCA2512-00001',
    'Customer requested no more mail',
    'CUSTOMER_REQUEST',
    'PHONE',
    'Jane Operator',
    'Customer called on 2025-04-20 and requested to be removed from all mailings'
);
```

### Example 5: Refreshing the Campaign Overview

```sql
-- Refresh the materialized view
SELECT refresh_mail_campaign_overview_mv();

-- Query the materialized view
SELECT * FROM mail_campaign_overview_mv;
```

### Example 6: Running Archival Processes

```sql
-- Run all archival processes
SELECT run_all_archival_processes();
```

## Maintenance Tasks to Schedule

1. **Refresh Materialized Views**: Daily
   ```
   0 1 * * * psql -U your_db_user -d Api-Property-Details -c "SELECT refresh_mail_campaign_overview_mv();"
   ```

2. **Archive Old Data**: Monthly
   ```
   0 3 1 * * psql -U your_db_user -d Api-Property-Details -c "SELECT run_all_archival_processes();"
   ```

3. **Database Maintenance**: Weekly
   ```
   0 2 * * 0 psql -U your_db_user -d Api-Property-Details -c "VACUUM ANALYZE;"
   ```

## Conclusion

You now have a complete database implementation for your Property Mail System. This design:

1. Stores property and loan information in a structured way
2. Supports multiple lead providers with a consistent field naming convention
3. Handles multiple owners per property through a normalized structure
4. Generates unique loan IDs for your mailers
5. Tracks changes to properties, owners, and loans
6. Prevents mailing to properties in the DNM registry
7. Organizes mail campaigns and recipients
8. Calculates mail dates based on configurable values
9. Provides a comprehensive view (complete_property_view) that includes ALL data points from ALL tables for your loan officers' UI
10. Archives old data to keep the system performant

The system is designed to be flexible, maintainable, and scalable, while preserving compatibility with your existing processes.

## Field Mapping from PropertyRadar to Database

This section shows how PropertyRadar fields map to our normalized database structure:

| PropertyRadar Field        | Database Table    | Database Field                |
|----------------------------|-------------------|-------------------------------|
| RadarID                    | properties        | radar_id                      |
| PType                      | properties        | property_type                 |
| Address                    | properties        | property_address              |
| City                       | properties        | property_city                 |
| State                      | properties        | property_state                |
| ZipFive                    | properties        | property_zip                  |
| County                     | properties        | county                        |
| APN                        | properties        | apn                           |
| Owner                      | property_owners   | full_name                     |
| OwnerFirstName             | property_owners   | first_name                    |
| OwnerLastName              | property_owners   | last_name                     |
| OwnerSpouseFirstName       | property_owners   | first_name (second record)    |
| OwnershipType              | properties        | ownership_type                |
| isSameMailingOrExempt      | properties        | is_same_mailing_or_exempt     |
| isMailVacant               | properties        | is_mail_vacant                |
| PhoneAvailability          | property_owners   | phone_availability            |
| EmailAvailability          | property_owners   | email_availability            |
| AVM                        | properties        | avm                           |
| AvailableEquity            | properties        | available_equity              |
| EquityPercent              | properties        | equity_percent                |
| CLTV                       | properties        | cltv                          |
| TotalLoanBalance           | properties        | total_loan_balance            |
| NumberLoans                | properties        | number_loans                  |
| FirstDate                  | loans             | first_date                    |
| FirstAmount                | loans             | first_amount                  |
| FirstRate                  | loans             | first_rate                    |
| FirstRateType              | loans             | first_rate_type               |
| FirstTermInYears           | loans             | first_term_in_years           |
| FirstLoanType              | loans             | first_loan_type               |
| FirstPurpose               | loans             | first_purpose                 |
| SecondDate                 | loans             | second_date                   |
| SecondAmount               | loans             | second_amount                 |
| SecondLoanType             | loans             | second_loan_type              |
| AnnualTaxes                | properties        | annual_taxes                  |
| EstimatedTaxRate           | properties        | estimated_tax_rate            |
| LastTransferRecDate        | properties        | last_transfer_rec_date        |
| LastTransferValue          | properties        | last_transfer_value           |
| LastTransferDownPaymentPercent | properties    | last_transfer_down_payment_percent |
| LastTransferSeller         | properties        | last_transfer_seller          |
| isListedForSale            | properties        | is_listed_for_sale            |
| ListingPrice               | properties        | listing_price                 |
| DaysOnMarket               | properties        | days_on_market                |
| inForeclosure              | properties        | in_foreclosure                |
| ForeclosureStage           | properties        | foreclosure_stage             |
| DefaultAmount              | properties        | default_amount                |
| inTaxDelinquency           | properties        | in_tax_delinquency            |
| DelinquentAmount           | properties        | delinquent_amount             |
| DelinquentYear             | properties        | delinquent_year               |

This mapping ensures that all valuable PropertyRadar fields are properly stored in our normalized database structure, while supporting multiple lead providers and multiple owners per property.
