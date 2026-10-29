# Passage Android — checkpoint

This is an **unverified development checkpoint**, not a release-ready APK. Native compilation, typechecking, Expo dependency alignment, emulator/device execution, OCR and server integration remain to be completed on Linux.

## Implemented

- Expo SDK 55 / React Native TypeScript application with sign-in, daily review, searchable local library, manual capture, and settings screens.
- Per-installation HTTPS server configuration. BetterAuth email/password sign-in; session token in Expo SecureStore and Bearer API requests. Password is not persisted.
- SQLite databases separated by SHA-256 of server origin and user ID. Local sources/highlights and transactional capture/outbox writes.
- Ordered sync operations, persistent operation IDs, pull cursor, soft conflict blocking, foreground and OS-scheduled background sync.
- Local Expo Kotlin module for bundled Latin-script ML Kit text recognition. Camera/gallery selection, text-block selection, correction before save. No image upload path.
- Android text/image ACTION_SEND integration for initial and running activity intents; image shares copied to app-private cache with a 30 MB bound.
- Expo config plugin adds share filters, disables Android backup and production cleartext traffic. The app URL validator requires HTTPS even in development.

## Linux prerequisites and build

Use Node.js 22 LTS, JDK 17, Android SDK Platform 36, platform tools and an Android emulator or USB-debugging device. Install root workspace dependencies using the repository package manager first. This checkpoint does not include a verified dependency lock or generated native Android project.

From this directory, using dependencies provided by the root workspace:

```sh
npx expo install --fix
npx expo-doctor
npx tsc --noEmit
npx expo prebuild --platform android
npx expo run:android
npx expo start --dev-client
```

Native OCR and share hooks require the compiled development build; Expo Go cannot load this local module. Local module discovery is configured through `expo.autolinking.nativeModulesDir` in package.json. Inspect autolinking output to confirm `PassageNativeModule` is registered. Use an HTTPS reverse proxy or trusted development tunnel for the server; do not disable transport protection to send credentials across a LAN.

The bundled ML Kit model uses `com.google.mlkit:text-recognition:16.0.1`; Latin script is supported in this checkpoint. Native API wiring and Gradle plugin compatibility have not been compiled yet. EAS build profiles are included, but no EAS project or signing configuration is provisioned.

## Contract to verify before device testing

- Sign-in: `POST /api/auth/sign-in/email` returns `{token,user:{id,email}}`. API validates the BetterAuth session token via `Authorization: Bearer …`.
- Sync push: `POST /api/v1/sync/push` with `{operations:[{opId,entity,action,id,payload,baseRevision?}]}`. Results: `{results:[{opId,status,error?}]}`; accepted statuses `applied` and `duplicate`.
- Sync pull: `/api/v1/sync/pull?cursor=…` returns `{changes:[{entity,id,deleted?,data}],cursor,hasMore}`.
- Daily review: `GET /api/v1/daily-review` returns `{date,cards,completed,streak}`; cards currently assumed to be raw highlight objects. Actions use `POST /daily-review/:id` with `{action:'keep'|'skip'|'discard'}`.

**Known schema mismatch:** source creation currently sends `type: 'book'`; the server agent later reported the field is `category`. Align `src/types.ts` and `src/database.ts` with the final server schema before testing. Verify author nullability, review card shape, operation result entity shape, and revision behavior after an offline-created highlight is edited before its first sync.

## Known unfinished behavior and validation

- No Android build, typecheck, runtime, test, emulator, accessibility or visual verification has passed for this package yet.
- Conflict operations remain in the outbox and stop subsequent pushes. Settings can retry, but no complete conflict resolution/rebase UI exists. A true revision conflict will need explicit resolution.
- Review actions require an online connection. Cached daily cards can be read offline. Review cache dates come from the server and can be stale while offline.
- Background work is best effort under Android WorkManager. Force-stop and device power policies can prevent execution; opening the app retries foreground sync.
- SQLite content is app-private, not separately encrypted. Signing out clears visible state and stored session, retaining account-scoped offline data for later sign-in. There is no explicit local purge/export UI yet.
- Confirm session expiry and remote sign-out revocation. Native requests omit ambient cookies and use explicit Bearer tokens; the server must support this path.
- Shared image read failures currently populate an error as capture text; replace with a distinct error state before release. Temp image cleanup is age-based when another image arrives, not immediate deletion after OCR.
- OCR block selection and camera/gallery paths need real page photos, rotation checks, cancellation tests and large-image memory checks.
- Confirm release manifests preserve `usesCleartextTraffic=false`, `allowBackup=false`, share filters and permissions after prebuild.

Suggested acceptance run: sign in against a fresh HTTPS deployment, capture while offline, restart, reconnect and check no duplicates; switch server/account and confirm isolation; receive text/image shares both cold and warm; photograph a printed page, select/correct/save text; compare the same daily-review order against web; exercise conflicting edits; inspect queued WorkManager task and release manifest.

Reference APIs: [Expo SDK 55](https://docs.expo.dev/versions/v55.0.0/), [Expo module API](https://docs.expo.dev/modules/module-api/), [Expo background tasks](https://docs.expo.dev/versions/v55.0.0/sdk/background-task/), [ML Kit Android text recognition](https://developers.google.com/ml-kit/vision/text-recognition/v2/android).
