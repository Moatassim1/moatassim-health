// GG Gains native features: Sign in with Apple and Apple Health (steps, walking distance, active energy).
import Foundation
import Capacitor
import AuthenticationServices
import HealthKit

@objc(GGNativePlugin)
public class GGNativePlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "GGNativePlugin"
    public let jsName = "GGNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signInWithApple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "healthAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "healthAuthorize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "healthDays", returnType: CAPPluginReturnPromise)
    ]
    private var appleCall: CAPPluginCall?
    private let store = HKHealthStore()

    // MARK: Sign in with Apple
    @objc func signInWithApple(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            if let nonce = call.getString("nonce"), !nonce.isEmpty { request.nonce = nonce }
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.appleCall = call
            controller.performRequests()
        }
    }
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.webView?.window ?? ASPresentationAnchor()
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = cred.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else {
            appleCall?.reject("Apple didn't return a sign-in token.", "FAILED"); appleCall = nil; return
        }
        var name = ""
        if let n = cred.fullName { name = [n.givenName, n.familyName].compactMap { $0 }.joined(separator: " ") }
        appleCall?.resolve(["idToken": idToken, "name": name, "email": cred.email ?? ""])
        appleCall = nil
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let cancelled = (error as? ASAuthorizationError)?.code == .canceled
        appleCall?.reject(cancelled ? "Cancelled" : error.localizedDescription, cancelled ? "CANCELLED" : "FAILED")
        appleCall = nil
    }

    // MARK: Apple Health
    private var readTypes: Set<HKObjectType> {
        var s = Set<HKObjectType>()
        for id in [HKQuantityTypeIdentifier.stepCount, .distanceWalkingRunning, .activeEnergyBurned] {
            if let t = HKObjectType.quantityType(forIdentifier: id) { s.insert(t) }
        }
        return s
    }
    @objc func healthAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }
    @objc func healthAuthorize(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("Apple Health isn't available on this device.", "UNAVAILABLE"); return }
        store.requestAuthorization(toShare: nil, read: readTypes) { ok, err in
            if let e = err { call.reject(e.localizedDescription, "FAILED") } else { call.resolve(["ok": ok]) }
        }
    }
    @objc func healthDays(_ call: CAPPluginCall) {
        let days = max(1, min(120, call.getInt("days") ?? 7))
        let cal = Calendar.current
        let end = Date()
        guard let first = cal.date(byAdding: .day, value: -(days - 1), to: end) else { call.resolve(["days": [:]]); return }
        let start = cal.startOfDay(for: first)
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian); fmt.locale = Locale(identifier: "en_US_POSIX"); fmt.timeZone = TimeZone.current; fmt.dateFormat = "yyyy-MM-dd"
        var out: [String: [String: Double]] = [:]
        let lock = NSLock(), group = DispatchGroup()
        let wanted: [(String, HKQuantityTypeIdentifier, HKUnit)] = [
            ("steps", .stepCount, HKUnit.count()),
            ("km", .distanceWalkingRunning, HKUnit.meterUnit(with: .kilo)),
            ("activeKcal", .activeEnergyBurned, HKUnit.kilocalorie())
        ]
        for (key, id, unit) in wanted {
            guard let type = HKObjectType.quantityType(forIdentifier: id) else { continue }
            group.enter()
            let q = HKStatisticsCollectionQuery(quantityType: type,
                                                quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate),
                                                options: .cumulativeSum, anchorDate: start, intervalComponents: DateComponents(day: 1))
            q.initialResultsHandler = { _, results, _ in
                results?.enumerateStatistics(from: start, to: end) { stat, _ in
                    if let v = stat.sumQuantity()?.doubleValue(for: unit) {
                        lock.lock(); out[fmt.string(from: stat.startDate), default: [:]][key] = v; lock.unlock()
                    }
                }
                group.leave()
            }
            store.execute(q)
        }
        group.notify(queue: .main) { call.resolve(["days": out]) }
    }
}
