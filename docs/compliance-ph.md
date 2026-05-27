# Philippine Compliance Specification

This document turns the vague "PH compliance readiness" requirement into
concrete data and rules. Compliance values must be **configurable and
effective-dated** — contribution and tax tables change almost yearly, and a
code change every January is not acceptable.

## 1. BIR (Bureau of Internal Revenue)

### Document types
- **Sales Invoice (SI)** — for sale of goods.
- **Official Receipt (OR)** — for sale of services / on collection.
- The SI vs OR distinction is a first-class field on sales documents; reports
  and tax treatment depend on it.

### VAT
- Standard VAT rate: **12%** (configurable, effective-dated).
- Support VAT-exempt, zero-rated, and VAT-inclusive vs VAT-exclusive pricing.
- Store VAT amount as a separate Decimal line, never derived on the fly for posted docs.

### Withholding tax
- **Expanded Withholding Tax (EWT/CWT)** on purchases/payments, with
  configurable ATC codes and rates.
- Generate **BIR Form 2307** (Certificate of Creditable Tax Withheld).
- Support **SAWT** (Summary Alphalist of Withholding Taxes) and **QAP** exports.

### Numbering (critical)
- OR / SI / document numbers must be **gapless and sequential per series**,
  per BIR rules. A `UNIQUE` constraint is NOT sufficient — use the
  `document_sequences` mechanism (see database-schema.md §Gapless numbering)
  inside the same DB transaction with row locking.

### Registration / e-invoicing readiness
- Computerized Accounting System (**CAS**) / permit-to-use considerations.
- **EIS** electronic invoicing readiness (export-friendly data model).
- Books of accounts exports (General Journal, General Ledger, Sales/Purchase books).

## 2. Payroll statutory contributions

Model each as an **effective-dated bracket table**, not scalar settings:

```
contribution_tables (
  id, type,            -- SSS | PHILHEALTH | HDMF | WITHHOLDING_TAX
  effective_from DATE,
  effective_to   DATE NULL,
  ...
)
contribution_brackets (
  id, table_id,
  range_from DECIMAL, range_to DECIMAL,
  employee_share ..., employer_share ..., fixed_amount ..., rate ...
)
```

Covered:
- **SSS** (employee + employer + EC), with the monthly salary credit brackets.
- **PhilHealth** premium (percentage with floor/ceiling).
- **Pag-IBIG / HDMF** contributions.
- **Withholding tax on compensation** — TRAIN-law graduated tables (per payroll
  frequency: monthly / semi-monthly).

Other payroll rules:
- **13th-month pay** computation and the tax-exempt threshold.
- **De minimis benefits** and non-taxable allowances.
- **Final pay** computation on separation.
- Payroll periods can be **locked**; locked periods need admin override + audit.

## 3. Data Privacy Act (RA 10173)

- National Privacy Commission (**NPC**) registration of data processing systems.
- **Breach notification within 72 hours.**
- Consent capture and lawful-basis tracking for personal data.
- **Field-level encryption** for sensitive PII at rest: TIN, SSS/PhilHealth/HDMF
  numbers, bank accounts, and salary figures.
- Data subject rights: access, correction, erasure (subject to retention rules
  that override erasure for financial/payroll records).

## 4. Implementation checklist (per release)

- [ ] VAT rate and EWT ATC codes are editable, effective-dated config.
- [ ] SI/OR type recorded on every sales document.
- [ ] Gapless document numbering per series proven under concurrency.
- [ ] 2307 / SAWT / QAP exports generate from stored data.
- [ ] SSS / PhilHealth / HDMF / withholding tables are versioned and dated.
- [ ] 13th-month and final-pay computations validated against worked examples.
- [ ] PII fields encrypted; access audited.
- [ ] Retention policy prevents erasure of financial/payroll records.
