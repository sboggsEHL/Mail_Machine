# Product Context

## Purpose
- This project exists to streamline and automate the process of identifying potential refinance opportunities and managing direct mail campaigns to property owners.
- It provides value by creating an efficient workflow from property data collection to lead generation and response handling.
- The system enables loan officers to quickly access property and loan information when recipients respond to mailings.
- It supports multiple lead providers and multiple owners per property through a normalized database structure.
- The batch job processing system allows efficient handling of large volumes of property data.

## Problems Solved
- Manual property data management is time-consuming and error-prone; this system automates data standardization and processing.
- Processing large volumes of property data can overwhelm systems; the batch job architecture enables efficient asynchronous processing.
- Tracking which properties have been mailed to and preventing duplicate mailings is challenging without a centralized system.
- Without unique identifiers, connecting mail recipients to their property data when they call is difficult and inefficient.
- Compliance with Do Not Mail requests requires careful tracking and enforcement, which this system automates.
- Generating consistent mail campaign data with accurate dates and contact information is complex without automation.
- Managing data from multiple lead providers with different field names and formats is challenging without a normalized structure.
- Handling properties with multiple owners requires a flexible database design that a normalized structure provides.
- Processing PropertyRadar API data with correct formats (especially for dates and boolean values) requires specialized handling.

## User Experience Goals
- Loan officers should be able to instantly look up property and loan information when a recipient calls, using only the loan ID from the mailer.
- The system should prevent mailing to properties in the Do Not Mail registry automatically.
- Campaign managers should have clear visibility into campaign status, including counts of pending, mailed, returned, and responded mailings.
- Data entry and campaign setup should be streamlined with automated date calculations and standardized formats.
- The system should maintain a complete history of property and loan changes for audit and compliance purposes.
- The database should support multiple lead providers with a consistent field naming convention.
- The system should handle properties with multiple owners correctly in all workflows.
- Users should be able to monitor batch job progress and status for large data processing operations.
- Property data processing should happen in the background without affecting system responsiveness.
- The authentication system should provide secure access while minimizing the need for users to re-authenticate.
