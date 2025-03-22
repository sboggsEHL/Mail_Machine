# PropertyRadar to URLA Field Mapping for Refinance Targeting

## Key Data Points for Refinance Lead Identification

- Identified 50 most valuable PropertyRadar fields
- Mapped to corresponding URLA (Uniform Residential Loan Application) fields
- Focus on contactability, financial indicators, property details, and ownership signals

## Field Comparison Table

| PropertyRadar Field                | Description                                                          | Use Case for Refinance                                     | URLA Mapping                                       |
| ---------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| **RadarID**                        | Unique identifier for the property in PropertyRadar                  | Used for data accuracy and tracking                        | Not applicable                                     |
| **PType**                          | Property type classification (e.g., SFR, Condo)                      | Determines eligibility for certain loan programs           | "Property Type" in Section 4                       |
| **Address**                        | Property address                                                     | Used for mailing and verification                          | "Subject Property Address" in Section 2            |
| **City**                           | City where the property is located                                   | Used for geographic targeting and compliance               | Part of "Subject Property Address"                 |
| **State**                          | State where the property is located                                  | Ensures compliance with state-specific lending laws        | Part of "Subject Property Address"                 |
| **ZipFive**                        | 5-digit ZIP code                                                     | Used for geographic targeting and compliance               | Part of "Subject Property Address"                 |
| **County**                         | County where the property is located                                 | Used for compliance and targeting county-specific programs | Not explicitly listed on URLA                      |
| **APN**                            | Assessor’s Parcel Number                                             | Ensures correct property identification                    | Not on the consumer-facing URLA                    |
| **Owner**                          | Full name of the property owner                                      | Used for personalization and verification                  | "Borrower Information – Name" in Section 1         |
| **OwnerFirstName**                 | First name of the property owner                                     | Used for personalization and verification                  | Part of "Borrower Information – Name"              |
| **OwnerLastName**                  | Last name of the property owner                                      | Used for personalization and verification                  | Part of "Borrower Information – Name"              |
| **OwnerSpouseFirstName**           | First name of the owner's spouse                                     | Used for joint mailings and verification                   | "Co-Borrower Name" if applicable                   |
| **OwnershipType**                  | How title is held (e.g., individual, joint)                          | Determines eligibility and compliance                      | "Title – Manner of Holding Title" in Section 4     |
| **isSameMailingOrExempt**          | Indicates if the mailing address is the same as the property address | Used to determine owner occupancy                          | "Occupancy" section (Primary Residence)            |
| **isMailVacant**                   | Indicates if the mailing address is vacant                           | Used to suppress undeliverable addresses                   | Not on URLA                                        |
| **PhoneAvailability**              | Indicates if a phone number is available                             | Used for follow-up contact                                 | "Contact Information – Telephone" in Section 1     |
| **EmailAvailability**              | Indicates if an email address is available                           | Used for multi-channel marketing                           | "Contact Information – Email" in Section 1         |
| **AVM**                            | Automated valuation model estimate of property value                 | Determines equity/LTV ratios                               | Derived from appraisal in underwriting             |
| **AvailableEquity**                | Estimated dollar amount of equity (value - loan balances)            | Identifies cash-out candidates                             | Calculated during underwriting                     |
| **EquityPercent**                  | Equity as a percentage of property value                             | Used to assess refinance feasibility                       | Calculated during underwriting                     |
| **CLTV**                           | Combined Loan-to-Value ratio                                         | Used to assess refinance feasibility                       | Calculated during underwriting                     |
| **TotalLoanBalance**               | Sum of all mortgage balances                                         | Determines debt consolidation potential                    | "Amount of Existing Liens" in refinance section    |
| **NumberLoans**                    | Number of open loans on the property                                 | Used to identify consolidation opportunities               | Not directly listed on URLA                        |
| **FirstDate**                      | Origination date of the first mortgage                               | Used to assess loan age and refinance potential            | Not on URLA                                        |
| **FirstAmount**                    | Original amount of the first mortgage                                | Used to assess loan history                                | Not on URLA                                        |
| **FirstRate**                      | Current interest rate of the first mortgage                          | Identifies rate-and-term refinance candidates              | Not directly listed - used for savings calculation |
| **FirstRateType**                  | Rate type of the first mortgage (e.g., fixed, ARM)                   | Identifies ARM holders for fixed-rate refi targets         | Not directly listed on URLA                        |
| **FirstTermInYears**               | Original term of the first mortgage in years                         | Used to assess remaining term and refinance potential      | Not on URLA                                        |
| **FirstLoanType**                  | Type of the first loan (e.g., Conventional, FHA)                     | Used to tailor refinance offers                            | Not directly listed on URLA                        |
| **FirstPurpose**                   | Purpose of the first loan (e.g., purchase, refinance)                | Used to assess refinance history                           | Not on URLA                                        |
| **SecondDate**                     | Origination date of the second mortgage                              | Used to assess loan age and refinance potential            | Not on URLA                                        |
| **SecondAmount**                   | Original amount of the second mortgage                               | Used to assess loan history                                | Not on URLA                                        |
| **SecondLoanType**                 | Type of the second loan (e.g., HELOC, fixed)                         | Used to tailor refinance offers                            | Not directly listed on URLA                        |
| **AnnualTaxes**                    | Annual property tax bill                                             | Used to estimate escrow requirements                       | "Monthly Housing Expense – Real Estate Taxes"      |
| **EstimatedTaxRate**               | Estimated property tax rate                                          | Used to assess tax burden                                  | Not on URLA                                        |
| **LastTransferRecDate**            | Date of the last property transfer                                   | Used to assess ownership tenure                            | "Year Acquired" in refinance section               |
| **LastTransferValue**              | Value of the last property transfer                                  | Used to assess property appreciation                       | Not on URLA                                        |
| **LastTransferDownPaymentPercent** | Down payment percentage of the last transfer                         | Used to assess equity history                              | Not on URLA                                        |
| **LastTransferSeller**             | Seller in the last property transfer                                 | Used for historical context                                | Not on URLA                                        |
| **isListedForSale**                | Indicates if the property is currently listed for sale               | Used to exclude properties from refinance targeting        | Not on URLA                                        |
| **ListingPrice**                   | Current asking price if listed for sale                              | Used for context in marketing                              | Not on URLA                                        |
| **DaysOnMarket**                   | Number of days the property has been on the market                   | Used to assess market interest                             | Not on URLA                                        |
| **inForeclosure**                  | Indicates if the property is in foreclosure                          | Used to exclude properties from refinance targeting        | Not on URLA                                        |
| **ForeclosureStage**               | Current stage of foreclosure                                         | Used to assess foreclosure risk                            | Not on URLA                                        |
| **DefaultAmount**                  | Amount needed to reinstate the loan                                  | Used to assess financial distress                          | Not on URLA                                        |
| **inTaxDelinquency**               | Indicates if the property is tax delinquent                          | Used to assess financial distress                          | Not on URLA                                        |
| **DelinquentAmount**               | Amount of unpaid property taxes                                      | Used to assess financial distress                          | Not on URLA                                        |
| **DelinquentYear**                 | Year when the property first became tax delinquent                   | Used to assess duration of financial distress              | Not on URLA                                        |

[Full URLA Form Reference](https://www.villagrovestatebank.com/wp-content/uploads/2019/05/Uniform-Residential-Application.pdf)
) VALUES (
