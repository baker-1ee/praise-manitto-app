---
name: android-release-build
description: Bump this Expo/React Native app's version (in lockstep across app.json and android/app/build.gradle), commit the bump, then hand off the actual Gradle build to the user to run themselves. Use this whenever the user asks to cut a release build, bump the version for a release, prepare a Play Store update, or mentions "릴리즈 빌드"/"버전 올리고 빌드"/`gradlew bundleRelease` for this project. This project does NOT use `eas build`/`eas submit` — release builds are done locally via Gradle, and the user runs the build command themselves, not Claude.
---

# Android Release Build

This project builds release AABs locally with Gradle, not via `eas build`. Release
keystore signing is already configured through `android/keystore.properties`
(gitignored, local-only) — no signing setup is needed here.

## Why two files must move together

The version lives in two places that have to stay in sync:

- `app.json` — `expo.version` (marketing version string) and
  `expo.android.versionCode` (Expo's config, used if the native project is ever
  regenerated with `expo prebuild`)
- `android/app/build.gradle` — `versionCode` and `versionName`, which is what
  Gradle actually reads when running `bundleRelease`

`android/` is gitignored (see `.gitignore`), so `build.gradle` changes never show
up in `git status` — `app.json` is the only record of the version bump that ends
up in git history. Skipping the `build.gradle` edit means the build silently
ships the old version. Google Play also **rejects uploads whose versionCode
isn't strictly higher than the last one it received** (this has bitten this
project before — see commit `b64c654`), so the versionCode bump must never be
skipped or reused.

## Steps

1. **Read the current version.** Check `expo.version` and
   `expo.android.versionCode` in `app.json`, and cross-check them against
   `versionCode`/`versionName` in `android/app/build.gradle` — they should
   already match. If they don't, flag it before proceeding instead of silently
   picking one.

2. **Bump the version — no need to ask first.** Unless the user already gave a
   specific version, default to a patch bump (`x.y.z` → `x.y.(z+1)`) and
   `versionCode` + 1. This is a routine, low-risk edit (just version numbers),
   so proceed directly rather than pausing for confirmation.

3. **Update both files in the same step**, keeping them identical:
   - `app.json`: `expo.version` → new version string, `expo.android.versionCode`
     → new versionCode
   - `android/app/build.gradle`: `versionName` → new version string,
     `versionCode` → new versionCode

4. **Tell the user what changed**, e.g. "1.0.2 (versionCode 2) → 1.0.3
   (versionCode 3)".

5. **Commit the version bump** (only `app.json` will show in `git status` —
   `android/app/build.gradle` is gitignored, which is expected and fine).
   Follow this repo's existing convention for the message (see commit
   `b64c654` for style), something like:
   ```
   chore: 버전 X.Y.Z (versionCode N)로 업데이트
   ```
   No need to ask before this commit — it's part of the same routine action the
   user asked for. Push only if the user's usual workflow in this session has
   been to push straight to `main` after committing; otherwise just commit.

6. **Hand the build off to the user.** Do not run `./gradlew bundleRelease`
   yourself — the user runs the build locally on their own machine. Tell them
   to run:
   ```bash
   cd android && ./gradlew bundleRelease
   ```
   and that once it finishes, the signed bundle will be at:
   `android/app/build/outputs/bundle/release/app-release.aab`
   Remind them the next step after that is uploading that `.aab` to the Google
   Play Console (Internal testing track) themselves — that upload is a manual
   browser step this skill doesn't touch.
