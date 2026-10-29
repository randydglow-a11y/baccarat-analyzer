# Video reference: Small Road discrepancy

Reference: 2026-10-29 user-provided 111-second screen recording of the same shoe as the 68-hand PDF.

## Verified hand 7
At approximately 00:20 the reference application shows counter 7, Banker 14%, Player 71%, Tie 14%, and **two red filled dots** in the first Small Road column. The first seven recorded results are `T P P B P P P`.

Our `roadmaps.js` derived offset-2 algorithm yields red then blue. The published standard rule compares two cells to the left of the newest Big Road entry, and the cell directly above it; this also implies blue for the second dot at hand 7 because the comparison column has two entries while the new streak has three.

Sources:
- https://wizardofodds.com/games/baccarat/history/
- https://wsgc.wa.gov/sites/default/files/2024-06/Baccarat%20Game%20Description_WA-specific_v2.3.1.pdf

**Status: unresolved reference-specific difference.** Do not change the live derived road logic to force a red mark without checking further video checkpoints and determining the reference application's actual rule. The video-grounded regression in `road-tests-v2.html` intentionally documents this discrepancy.
