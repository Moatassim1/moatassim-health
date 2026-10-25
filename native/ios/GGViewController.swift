import UIKit
import Capacitor

// Registers GG Gains' own native features with the app's web view.
class GGViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(GGNativePlugin())
    }
}
