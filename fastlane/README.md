fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios versions

```sh
[bundle exec] fastlane ios versions
```

Show App Store version state

### ios signing

```sh
[bundle exec] fastlane ios signing
```

Fetch or create the distribution certificate and App Store profile

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload to TestFlight, with the English release notes as What to Test

### ios release

```sh
[bundle exec] fastlane ios release
```

Build and upload the binary to App Store Connect (no metadata, no auto-submit)

### ios upload_ipa

```sh
[bundle exec] fastlane ios upload_ipa
```

Upload an already-built IPA from build/ to App Store Connect

### ios upload_screenshots

```sh
[bundle exec] fastlane ios upload_screenshots
```

Replace the screenshots of the version in preparation with fastlane/screenshots (made by yarn screenshots)

### ios upload_metadata

```sh
[bundle exec] fastlane ios upload_metadata
```

Upload the store texts and release notes from fastlane/metadata to the version in preparation

### ios pull_metadata

```sh
[bundle exec] fastlane ios pull_metadata
```

Download the App Store metadata into fastlane/metadata

### ios submit

```sh
[bundle exec] fastlane ios submit
```

Submit the uploaded build for review with the release notes from fastlane/metadata

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
