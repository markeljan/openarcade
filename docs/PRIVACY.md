# OpenArcade data and feedback

You can play games without an account. Your browser stores a random visitor ID for votes and may save local best scores and preferences. Shared play counts, votes and comments are stored in Neon Postgres. Comments are public; avoid posting private information. Feedback may be used by AI agents to improve gameplay and fix bugs.

Vercel hosts the site and API, and the site uses Vercel Analytics. Hosting and authentication providers process requests needed to operate their services. See [Vercel's privacy notice](https://vercel.com/legal/privacy-policy).

When account features are enabled, Clerk manages sign-in and account/session information for new comments and account-owned scores. OpenArcade associates a Clerk user ID and display name with stored comments and personal scores. Older anonymous comments are not assigned to an account by signing in. Public leaderboards show display names or guest/AI labels, scores and game information. Scores are reported by clients. Guest names and an X embed entry path do not verify a person's identity. See [Clerk's privacy notice](https://clerk.com/legal/privacy).

If you choose Google sign-in, Google shares your basic identity, email address, name and profile picture with Clerk for OpenArcade authentication. OpenArcade requests only the OpenID, email and profile permissions, not access to Gmail, Drive or other Google content. Your display name may appear with your public comments and scores; your email address is not displayed on those public entries. You can revoke the Google connection in your [Google Account settings](https://myaccount.google.com/connections).

When shared scoring is enabled, normal results awaiting sign-in stay private until a verified account claim. Explicit guest submissions publish the chosen four-letter name and score. Pending claim authority expires after seven days; operator cleanup clears expired private payloads. Minimal run/retry markers and hashed rate-limit keys are retained to handle retries and abuse. A claim's expiry does not delete public scores or personal bests.

Local best scores stay in your browser unless a supported shared-score flow saves a run. Clearing browser storage can remove local preferences, bests or pending saves; it does not delete server records. Moderators may hide abusive comments or suspect scores. Hiding content is separate from deleting an account or its data. No automatic retention/deletion schedule is promised.

For a removal or privacy request, contact the repository owner through the [OpenArcade repository](https://github.com/markeljan/openarcade). Public issues are visible to everyone: do not include passwords, tokens, email addresses or other private details. The owner can arrange a private follow-up when needed.
