import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = GameViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// Full-screen racing view. Thrust pads sit near the screen corners, so system edge swipes
/// (Home, Control Centre) need a second swipe.
/// The status bar (UIStatusBarHidden in Info.plist) and the home indicator are hidden by
/// Capacitor's SystemBars plugin (`plugins.SystemBars.hidden` in capacitor.config.ts): Capacitor 8
/// declares prefersHomeIndicatorAutoHidden itself as public, not open, so it cannot be overridden here.
class GameViewController: CAPBridgeViewController {
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
}
