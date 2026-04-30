# Financial-Fraud-Checker

A browser-based fraud payment screening demo with a service-layer architecture and a Feedzai-inspired UI.

## Architecture

This implementation is now organized into a structured agent workflow:

- `src/services/transactionService.js`: orchestrates end-to-end screening and decisioning
- `src/agents/classifier.js`: first-pass classification by `Claude Haiku`
- `src/agents/specterEnricher.js`: private-company enrichment by `Specter`
- `src/agents/decisionRouter.js`: auto-decision routing for approve/block/review
- `src/data/privateCompanies.js`: specific private company profiles and risk signals
- `src/utils/logger.js`: centralized agent log UI support

## Specter private-company enrichment

`Specter` now enriches transactions with company-level signals for private merchants, including:

- funding stage and latest raise
- employee count and ownership type
- industry and sector notes
- precomputed company risk score
- compliance and signal summaries

This enables the service layer to capture richer contextual intelligence for private companies rather than only basic merchant risk profiles.

## Files

- `index.html`: main transaction screening dashboard
- `styles.css`: UI styling and Feedzai-like dashboard layout
- `script.js`: UI glue code connecting browser controls to the service layer
- `src/`: modular agent and data code for production-like architecture

## How to use

1. Open `index.html` in your browser.
2. Enter transaction details.
3. Submit to see the agent workflow, Specter enrichment details, and final risk decision.

## Notes

This is a frontend proof-of-concept demonstrating a layered fraud-screening architecture with a private-company enrichment integration. It is designed to mimic the flow shown in the provided screening diagram.

