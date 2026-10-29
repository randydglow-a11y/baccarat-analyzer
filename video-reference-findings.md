# Video reference: Small Road discrepancy

Reference: 2026-10-29 user-provided 111-second screen recording of the same shoe as the 68-hand PDF.

## Verified hand 7
At approximately 00:20 the reference application shows counter 7, Banker 14%, Player 71%, Tie 14%, and **two red filled dots** in the first Small Road column. The first seven recorded results are `T P P B P P P`.

Our `roadmaps.js` derived offset-2 algorithm yields red then blue. The published standard rule compares two cells to the left of the newest Big Road entry, and the cell directly above it; this also implies blue for the second dot at hand 7 because the comparison column has two entries while the new streak has three.

Sources:
- https://wizardofodds.com/games/baccarat/history/
- https://wsgc.wa.gov/sites/default/files/2024-06/Baccarat%20Game%20Description_WA-specific_v2.3.1.pdf

**Status: unresolved reference-specific difference.** Do not change the live derived road logic to force a red mark without checking further video checkpoints and determining the reference application's actual rule. The video-grounded regression in `road-tests-v2.html` intentionally documents this discrepancy.

## Hand-by-hand trace of the first seven outcomes

| Hand | Result | Decisive Big Road run | Small Road under current code |
|---|---|---|---|
| 1 | Tie | none | none |
| 2 | Player | P run 1, row 1 | none |
| 3 | Player | P run 1, row 2 | none |
| 4 | Banker | B run 2, row 1 | none |
| 5 | Player | P run 3, row 1 | none |
| 6 | Player | P run 3, row 2 | red |
| 7 | Player | P run 3, row 3 | blue |

At hand 7 the comparison is Big Road column 1 (Player) at row 3 versus row 2. Row 3 is empty while row 2 is occupied, so the standard algorithm yields blue. The video screenshot was previously interpreted as two red marks at counter 7. **This is not yet proof of a reference-specific rule:** the screenshot's mark-to-road association and timing must be checked before changing production.

The currently used implementation compares logical run depths. The official rule uses *physical cell occupancy* and special handling for dragon tails. We should build a physical-cell reference implementation and compare it against the existing algorithm for long runs, without replacing the live implementation prematurely.

Source: https://wsgc.wa.gov/sites/default/files/2025-02/3187%20Baccarat%20-%20Approval%20Letter%20ETG%20%28updated%29signed_0.pdf

## Verified individual video frames (October 29)

Direct inspection of the supplied recording `ScreenRecording_10-29-2026 07-25-11_1.mp4`:
- **00:17, counter 5:** Small Road empty.
- **00:19, counter 6:** Small Road has one red filled mark in its first column, row 1.
- **00:20, counter 7:** Small Road has two red filled marks in its first column, rows 1 and 2.

The frame at counter 6 verifies the first mark's color. The next frame verifies that the **second mark appears red at hand 7**, rather than merely being moved later. Our current implementation returns red at hand 6 and blue at hand 7. The **first confirmed discrepancy is color at hand 7**; positioning of the second mark is downstream of that color difference.

This is video evidence of the reference application's behavior, not evidence that the reference uses a published standard convention. Keep the distinction explicit. Do not change the live algorithm based on one anomalous rule until further hand-by-hand checkpoints identify a consistent reference-specific formula.

## Frame crop independently inspected

The 00:22 frame at counter 8 was cropped to show all three derived-road panels separately. The **upper panel** has hollow circles (Big Eye Boy), the **middle panel** has two solid red circles (Small Road), and the **lower panel** is empty (Cockroach Pig). Thus the two red marks were correctly assigned to Small Road; they are not Big Eye Boy marks.

The earlier documentation used hand 7 at 00:20; the 00:22 frame corroborates the road identity, but it is a different counter (8). Keep the exact timestamp and hand counter attached to each observation. The video UI's large colored outcome overlay can obscure parts of the display.

No rule change is justified yet from this crop alone.
