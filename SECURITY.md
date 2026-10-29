# Security

Report a suspected vulnerability privately through
[FraserGrant's contact page](https://fraser-grant.com/contact/). Avoid including
passwords, browser cookies or working access keys in an issue or initial message.

This package runs inside n8n with its normal community-node privileges. The
Camofox service is a separate trusted component and controls browser isolation,
website access and persisted login state. A Browser User ID selects a session;
it is not a substitute for service access control.
