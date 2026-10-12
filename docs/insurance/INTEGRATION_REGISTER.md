# Salesdam V3 — Integration Register

- **Date:** 2026-10-11
- **Rule:** an integration is only `VERIFIED` after a real or provider-approved
  sandbox test succeeds. Until then it is `UNVERIFIED` or `MISSING CREDENTIALS`.
  No mock is ever recorded as production-ready.

| Provider / capability | Purpose | Implementation status | Credentials / sandbox | Verification |
|-----------------------|---------|----------------------|-----------------------|--------------|
| Euphoria Telecoms | Click-to-call, call logging, recordings | NOT IMPLEMENTED | Not supplied | UNVERIFIED |
| Meta Lead Ads | Lead capture | NOT IMPLEMENTED | Not supplied | UNVERIFIED |
| Facebook Messenger | Omnichannel inbox | NOT IMPLEMENTED | Not supplied | UNVERIFIED |
| Instagram messaging | Omnichannel inbox | NOT IMPLEMENTED | Not supplied | UNVERIFIED |
| WhatsApp Business | Messaging + approved templates | NOT IMPLEMENTED | Not supplied | UNVERIFIED |
| Email (SMTP/provider) | Transactional + case email | Core scaffolding only (`EmailSender`, `EmailTemplate`) | Not supplied | UNVERIFIED |
| Debit order provider | Collections | NOT IMPLEMENTED | Not supplied | UNVERIFIED |
| Pay@ | Payment collection | NOT IMPLEMENTED | Not supplied | UNVERIFIED |
| EasyPay | Payment collection | NOT IMPLEMENTED | Not supplied | UNVERIFIED |
| Payment gateway | Online payments | Core scaffolding (`routes/paystackWebhook.js`) | Not supplied | UNVERIFIED |
| Underwriter systems | Remittance / references | NOT IMPLEMENTED | Not supplied | UNVERIFIED |

## Adapter requirements (to build)
- `PaymentProvider` interface: submit, status/webhook verify, reconcile, retry.
- `CommsProvider` interface: email, WhatsApp, Messenger, Instagram.
- `TelephonyProvider` interface: click-to-call, call events, recording refs.
- All adapters resolve tenant context server-side and reject unverified success.

## Outstanding dependencies (blockers)
- Provider sandbox credentials and API documentation.
- Confirmation of which channels are launch-critical vs. post-launch.
- Webhook signing secrets for each provider.
