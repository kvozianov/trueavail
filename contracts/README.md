# Transfer Rail Contract Scaffold

These contracts support the MVP described in `docs/transfer-rail-mvp-plan.md`.

## Contracts

- `IdentityRegistry.sol`: allowlists KYB-approved wallets and maps each wallet to a company group id.
- `CorporateLiquidity.sol`: accepts a native ETH mock transfer only when sender and recipient are approved under the same company group. It emits an encrypted memo hash for compliance lookup.

## MVP Boundary

This folder is a scaffold. It is not deployed from this repository yet because deployment needs a funded zkSync Era Sepolia wallet, RPC configuration, and private-key handling outside the demo code.

Recommended next step:

1. Add Hardhat and zkSync deploy tooling.
2. Deploy `IdentityRegistry`.
3. Add the demo wallets from `lib/transfers/transfer-rail-fixtures.ts`.
4. Deploy `CorporateLiquidity` with the registry address.
5. Store contract addresses in environment variables and keep the current mock mode as fallback.
