import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Registered, not stored: these only stand in until something is set.
    var defaults: [String: Any] = [:]

    // The Settings bundle's defaults, among them the version a build step
    // writes into it, so the app reads what the Settings app shows.
    if let url = Bundle.main.url(
      forResource: "Root", withExtension: "plist", subdirectory: "Settings.bundle"),
      let specifiers = NSDictionary(contentsOf: url)?["PreferenceSpecifiers"]
        as? [[String: Any]]
    {
      for specifier in specifiers {
        if let key = specifier["Key"] as? String, let value = specifier["DefaultValue"] {
          defaults[key] = value
        }
      }
    }

    UserDefaults.standard.register(defaults: defaults)
    return true
  }
}
