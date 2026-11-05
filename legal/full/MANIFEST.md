# Full-text archive of the Acts (reference copies)

Added 5 Nov 2026. These are the WHOLE Acts, extracted from the India Code PDFs that are kept next to them in `../source-pdfs/`.
They are the source of truth you update when the law changes. The Worker does NOT load these files whole: together they are about 198,000 words
(roughly 277,000 tokens), more than a model can read in one call. The Worker keeps loading the small curated files one level up (`../*.txt`) until
section-level loading is built and tested.

| File | Act | Version in the PDF | Pages | Words |
|---|---|---|---|---|
| `code-on-wages-2019.txt` | Code on Wages, 2019 (Act 29 of 2019) | As on 21 Nov 2025 | 32 | 17,394 |
| `industrial-relations-code-2020.txt` | Industrial Relations Code, 2020 (Act 35 of 2020) | As on 1 Sep 2026 | 67 | 33,705 |
| `code-on-social-security-2020.txt` | Code on Social Security, 2020 (Act 36 of 2020) | As on 21 Nov 2025 | 113 | 63,930 |
| `osh-code-2020.txt` | Occupational Safety, Health and Working Conditions Code, 2020 (Act 37 of 2020) | As on 28 Nov 2025 | 84 | 45,343 |
| `posh-act-2013.txt` | Sexual Harassment of Women at Workplace Act, 2013 (Act 14 of 2013) | As on 1 Aug 2026 | 17 | 7,007 |
| `indian-contract-act-1872.txt` | Indian Contract Act, 1872 (Act 9 of 1872) | Date not stated in the PDF | 53 | 30,702 |

## What was done to the text
Only two kinds of noise were removed: the "India Code" watermark that the PDF prints as five fragments on every page, and the printed page number.
Leading indentation was capped and blank lines left by a removed watermark inside a sentence were closed. The statute wording is unchanged.

## How it was checked (5 Nov 2026)
Each PDF was extracted twice, with `pdftotext -layout` (the file kept here) and with `pdftotext -raw` (an independent reading order).
Every word, number and punctuation mark of the two was compared. The only differences are exactly the watermark letters (5 fragments per page)
and one printed page number per page, and nothing was added. Every section number from 1 to the last section of each Code appears in the text.
This proves the cleaning lost nothing. It does not prove the India Code PDF itself is free of errors, and no lawyer has reviewed these copies.

## Notes
- The Code on Social Security was also supplied as the Gazette copy (bilingual, as passed in 2020). It is not stored: the consolidated India Code copy above is the one kept.
- Footnotes of the printed Acts (amendment notes, "Subs. by", "Rep. by") are part of the text as published.
- To update after an amendment: replace the PDF in `../source-pdfs/`, re-run the extraction, update the "Version in the PDF" cell here, and re-run the check above.
- This archive contains the Acts only. Rules, forms, notifications and portal procedures (central and state) are NOT here.
