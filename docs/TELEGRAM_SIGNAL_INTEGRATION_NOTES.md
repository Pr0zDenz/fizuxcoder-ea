# Telegram Signal Integration Notes

The Telegram Bot API is an HTTPS interface. The site will send channel messages with the server-side bot token through `sendMessage`; the token is never stored in the browser or database. Telegram replies with a JSON response that contains an `ok` boolean and a provider error description when a request fails.[1]

Automatic delivery is limited to unique, validated Gemini EA `setup` events. Each event must contain an account number, symbol, BUY/SELL direction, numeric entry price, and an EA-supplied `occurredAt` value in `HH:mm:ss` 24-hour format. The portal retains its own `createdAt` receipt timestamp. Take-profit events, invalid payloads, duplicate event IDs, paused delivery, missing credentials, and an engaged kill switch are recorded but not channel-posted.

The configured Telegram bot must be an administrator with permission to post in the selected channel. The channel can be addressed with a public `@username` or a private numeric `-100...` identifier. A visible connection test requires an administrator to type the exact confirmation phrase before the site sends a clearly marked non-trading message.

## Reference

[1]: https://core.telegram.org/bots/api "Telegram Bot API"
