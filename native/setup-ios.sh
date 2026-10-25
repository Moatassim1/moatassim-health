#!/bin/bash
# Applies GG Gains settings to the generated iOS project (runs on the Mac build machine).
set -euo pipefail
trap 'echo "::error::setup-ios.sh line $LINENO failed: $BASH_COMMAND"' ERR
APP=ios/App/App
PL="$APP/Info.plist"
pb() { /usr/libexec/PlistBuddy -c "$1" "$PL" 2>/dev/null || true; }
pb "Delete :CFBundleDisplayName"; pb "Add :CFBundleDisplayName string GG Gains"
pb "Delete :NSCameraUsageDescription"; pb "Add :NSCameraUsageDescription string GG Gains uses the camera to scan food barcodes and take your daily progress photo."
pb "Delete :NSPhotoLibraryUsageDescription"; pb "Add :NSPhotoLibraryUsageDescription string Choose a progress photo or profile picture from your library."
pb "Delete :NSPhotoLibraryAddUsageDescription"; pb "Add :NSPhotoLibraryAddUsageDescription string Save your transformation video to Photos."
pb "Delete :ITSAppUsesNonExemptEncryption"; pb "Add :ITSAppUsesNonExemptEncryption bool false"
pb "Delete :UISupportedInterfaceOrientations"; pb "Add :UISupportedInterfaceOrientations array"; pb "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait"
pb "Delete :CFBundleURLTypes"
pb "Add :CFBundleURLTypes array"
pb "Add :CFBundleURLTypes:0 dict"
pb "Add :CFBundleURLTypes:0:CFBundleURLName string com.gggains.app"
pb "Add :CFBundleURLTypes:0:CFBundleURLSchemes array"
pb "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string com.gggains.app"
pb "Delete :NSHealthShareUsageDescription"; pb "Add :NSHealthShareUsageDescription string GG Gains reads your steps, walking distance and active calories from Apple Health to show them in your diary and count them towards your step goal."
pb "Delete :NSHealthUpdateUsageDescription"; pb "Add :NSHealthUpdateUsageDescription string GG Gains does not write to Apple Health."
# Native features (Sign in with Apple, Apple Health)
cp native/ios/GGNativePlugin.swift native/ios/GGViewController.swift native/ios/App.entitlements "$APP/"
gem list -i xcodeproj >/dev/null 2>&1 || sudo gem install xcodeproj --no-document
ruby native/ios/add-files.rb 2>&1 | tail -5 | sed 's/^/::notice::ruby: /'
sed -i '' 's/customClass="CAPBridgeViewController" customModule="Capacitor"/customClass="GGViewController" customModule="App" customModuleProvider="target"/' "$APP/Base.lproj/Main.storyboard"
echo "::notice::Storyboard: $(grep -o 'customClass="[A-Za-z]*"' "$APP/Base.lproj/Main.storyboard" | head -3 | tr '\n' ' ')"
# Icon and splash
ICON=$(ls "$APP"/Assets.xcassets/AppIcon.appiconset/*.png | head -1)
cp native/AppIcon-1024.png "$ICON"
for f in "$APP"/Assets.xcassets/Splash.imageset/*.png; do cp native/splash.png "$f"; done
echo "Info.plist:"; /usr/libexec/PlistBuddy -c "Print" "$PL" | head -80
