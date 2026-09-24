# /legal — Vantage Bare Acts Library

These files are loaded by the Cloudflare Worker at runtime to give Claude
the actual statutory text when answering PACT and Policy Advisor questions.

## Files

| File | Act | Status |
|---|---|---|
| `ir-code-2020.txt` | Industrial Relations Code 2020 | Key sections (Ch I, IV, IX, X, XII, XIII) |
| `posh-act-2013.txt` | POSH Act 2013 | Full text (all operative sections) |
| `wages-code-2019.txt` | Code on Wages 2019 | Key sections (definitions, minimum wages, payment, bonus) |

## How the Worker uses these

1. User asks a Policy Advisor or PACT question
2. Worker runs `selectActsForCase()` or `selectActsForPolicy()` — keyword maps the question to relevant acts
3. Worker runs `loadActsForContext()` — fetches each act from GitHub raw URL
4. Cloudflare Cache API stores each act for 24 hours (no repeated GitHub fetches per edge node)
5. Worker calls `callClaudeWithCachedDocument()` — passes the act text as a cached system block
6. Claude reads the actual statute, not just training knowledge

## Updating an act file

When a code is amended or a new notification is issued:
1. Update the relevant `.txt` file with the new section text
2. Push to GitHub
3. Cloudflare cache automatically expires within 24 hours — or redeploy Worker to force refresh

## When to add a new file

| When this happens | What to do |
|---|---|
| Code on Social Security 2020 is notified | Add `css-code-2020.txt`, update `selectActsForCase()` to include it for gratuity/EPF queries |
| OSH Code 2020 is notified | Add `osh-code-2020.txt`, include for workplace safety queries |
| POSH Act amended | Update `posh-act-2013.txt` |
| State-specific act needed | Add `<state>-shops-est-act.txt`, extend selector to check MERIDIAN state param |

## Replacing with official full text

The current files contain the key operative sections. To replace with the
full official text:

- IR Code 2020: https://www.indiacode.nic.in/handle/123456789/22040
- POSH Act 2013: https://wcd.nic.in (Ministry of Women & Child Development)
- Code on Wages 2019: https://www.indiacode.nic.in/handle/123456789/15272

Extract text from the PDF, clean (remove page numbers, headers),
and replace the file contents. The Worker infrastructure handles the rest.
