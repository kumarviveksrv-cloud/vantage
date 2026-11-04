# /legal — Vantage Bare Acts Library

These files are loaded by the Cloudflare Worker at runtime to give Claude
the actual statutory text when answering PACT and Policy Advisor questions.

## Files

| File | Act | Status |
|---|---|---|
| `ir-code-2020.txt` | Industrial Relations Code 2020 | REBUILT 4 Nov 2026 from the Gazette of India Extraordinary copy (Act 35 of 2020), checked against the full India Code PDF on 4 Nov 2026 with no difference in substance (departures: bracketed Act numbers such as "(63 of 1948)" are left out): s.2 definitions (employer, industry, retrenchment, unfair labour practice, wages, worker), Chapter IV (ss.28 to 38), Chapters IX and X (ss.65 to 82), ss.84 to 86 and the Second Schedule. Replaces the earlier hand-condensed file, which had wrong section numbers (s.29 and s.38 mislabelled), a wrong continuous-service day count (190 instead of 240) and a paraphrased penalty list. The IR Code (Amendment) Act 2026 changes only s.104, so nothing here is affected. Marginal headings of the printed Act may appear as short separate lines. |
| `posh-act-2013.txt` | POSH Act 2013 | Full text (all operative sections) |
| `wages-code-2019.txt` | Code on Wages 2019 | REBUILT 3 Nov 2026. Selected sections only (2(k), 2(y), 3, 4, 5, 16 to 25, 26 to 29, 43, 54, 57, 59, 60, 61, 69), verbatim from the India Code Gazette PDF and checked word by word. The earlier hand-written version had wrong section numbers and was replaced. |
| `social-security-maternity-2020.txt` | Code on Social Security 2020, Chapter VI (maternity benefit) | ADDED 3 Nov 2026. Sections 59 to 72 plus 1(4), First Schedule entry, 2(43), 41(7) and 164, verbatim from the India Code PDF. Replaces the Maternity Benefit Act 1961 (repealed from 21 Nov 2025). |
| `social-security-gratuity-2020.txt` | Code on Social Security 2020, Chapter V (gratuity) | ADDED 3 Nov 2026. Sections 53 to 56 plus 1(4), First Schedule entry and 164, verbatim. Replaces the Payment of Gratuity Act 1972. |
| `indian-contract-act-1872.txt` | Indian Contract Act 1872 | ADDED 3 Nov 2026. Selected sections only (15, 16, 23, 27, 73, 74), text from India Code. Optional: the Worker loads it for notice, bond, restraint, recovery and poaching cases, and skips it silently if the file is ever removed |

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

## The Indian Contract Act file (selected sections)

`indian-contract-act-1872.txt` holds ss. 15, 16, 23, 27, 73 and 74 only (coercion, undue influence, lawful object, restraint of trade, damages, penalty),
copied word for word from India Code (https://www.indiacode.nic.in/handle/123456789/2187). The full Act is deliberately not added: it is long and is sent to Claude on every matching case.
Statute text carries no case law. If a note on s.27 and service-bond decisions is ever added, it must be written and verified by a lawyer and headed clearly as a note, not statute text.
