# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ML Kit, which reads the box codes for the camera, finds its parts by name
# and creates them at runtime. R8 sees no call to their constructors and
# strips them, which leaves the code scanner, and so the camera, dead.
-keepclassmembers class * implements com.google.firebase.components.ComponentRegistrar {
    public <init>();
}
