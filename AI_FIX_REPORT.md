# Fix Report: Episode Merging Playback Glitch

## Issue
The user reported that when merging episodes (segments) during editing, the playback gets messed up and the interface glitches.

## Investigation
- The issue was traced to `src/hooks/useSegmentEditing.js`.
- The `restoreAudioState` function was being called after every successful edit (save, merge, split).
- `restoreAudioState` resets the audio player's `currentTime` to the value it had when the edit session started (`initialAudioState`).
- If the user played audio during the edit session (or if the save operation took time while audio was playing), this caused the player to jump back in time unexpectedly.
- This jump caused "messed up playback" and likely "interface glitches" as the active segment changed abruptly.

## Fix
- Modified `src/hooks/useSegmentEditing.js` to remove `restoreAudioState()` calls from the success paths of `handleSaveCurrentSegmentEdit` and `executeAction`.
- `restoreAudioState()` is now only called when the user *cancels* an edit (`handleCancelEdit`), which is the expected behavior (revert to where I was).
- When an edit is committed (saved/merged), the player now continues from its current position (playing or paused), providing a smooth experience.

## Files Changed
- `src/hooks/useSegmentEditing.js`
