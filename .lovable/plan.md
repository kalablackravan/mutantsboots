# Move the lab room to the restricted door

## Changes
- Keep the middle LAB LOCKDOWN door visually interactive on hover, but remove its click action.
- Change the right restricted/opening door so clicking it opens the existing pinned `2ndbg.webp` lab room overlay.
- Stop the right door from navigating to the current Fomies office scene.
- Preserve its existing open/close artwork, hover sound, dark entrance, zoom animation, and EXIT control.

## Verification
- Confirm the middle door click does nothing.
- Confirm the right door opens `2ndbg.webp`, not the attached Fomies office scene.
- Confirm EXIT closes the lab room and the project builds cleanly.
