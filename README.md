# Mini Figure Revealr

Point your phone at the code on the side of a LEGO® minifigure box and see
right away which figure is inside. No shaking, no squeezing, no guessing.

- **Reveal:** find the small square code next to the barcode on the box,
  hold your phone up to it, in the store or at home, and the figure inside
  appears.
- **Complete your series:** every figure you scan is ticked off. Open the
  series to see what you already have and what is still missing, and tick
  figures on or off by hand. With iCloud, your collection is the same on
  your iPhone and iPad.
- **Your way:** a big reveal card, a split screen with the whole series in
  view, or a slim strip that leaves the camera almost free. Optionally each
  figure is drawn right on its box code in the camera. Light and dark mode,
  in English, German, Spanish, French, Italian, Polish, Portuguese, Russian
  and Chinese.
- **Always up to date:** new series and figures are downloaded
  automatically and stay on your phone, so scanning works offline too.

No account, no ads, no tracking: see the [privacy policy](privacy.md).

## Support

Found a bug, a box the app doesn't know, or have an idea? Please
[open an issue](https://github.com/pke/mfrevealr/issues).

## Development

A bare React Native app for iOS and Android.

```sh
yarn install
cd ios && pod install && cd ..   # system pod; bundle exec pod fails on Ruby 4
yarn ios                         # or: yarn android
```

| Task | Command |
| --- | --- |
| Unit tests | `yarn test` |
| Lint | `yarn lint` |
| End-to-end tests (simulated camera) | `yarn e2e:build:ios`, then `yarn e2e --target ios` |
| App Store screenshots, all languages | `yarn screenshots` |
| Publish a new figure catalog | `yarn catalog:release` |
| TestFlight / App Store | `fastlane ios beta` / `fastlane ios release` |

Debug builds install next to the release app as **Mini Figure Revealr Dev**
(`dev.dudesoft.mfrevealr.dev`).

---

All names, logos and trademarks are the property of their respective owners
and are mentioned only to describe compatibility, without any claim of
ownership. This app is not affiliated with or endorsed by the LEGO Group.
