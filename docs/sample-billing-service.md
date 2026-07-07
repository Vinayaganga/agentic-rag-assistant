# Billing Service Overview

The billing service handles subscription plans, invoicing, and payment
processing for all customer accounts. It integrates with a third-party
payment processor and emits billing events to the internal event bus.

## Plan Tiers

There are three subscription tiers: Free, Pro, and Enterprise. Free accounts
are limited to 1,000 API calls per month. Pro accounts get 100,000 calls per
month at $49/month. Enterprise accounts have custom limits negotiated per
contract.

## Failed Payment Handling

If a payment fails, the account is placed into a 7-day grace period during
which service continues uninterrupted. Three payment retry attempts are made
during the grace period, spaced 48 hours apart. If all retries fail, the
account is downgraded to the Free tier and the customer is notified by email.

## Invoicing

Invoices are generated on the first day of each billing cycle and are
available for download as PDFs from the customer billing portal within
24 hours of generation.
