"use client";

// Opening the native camera (file input with capture) hides the page on
// Android/iOS, which the anti-cheat visibilitychange listener would count as a
// tab switch — penalising a student for simply photographing their answer.
// SubjectiveAnswerInput sets this flag before launching the camera and clears
// it once the user is back (photo picked or cancelled); the tab-switch listener
// in StudentTestRunner checks it. Module-level singleton: both run in the same
// client bundle.

let suppressed = false;

export function suppressTabSwitch(on: boolean): void {
  suppressed = on;
}

export function isTabSwitchSuppressed(): boolean {
  return suppressed;
}
