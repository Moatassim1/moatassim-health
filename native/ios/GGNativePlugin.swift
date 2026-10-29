// GG Gains native features: Sign in with Apple and Apple Health (steps, walking distance, active energy).
import Foundation
import Capacitor
import AuthenticationServices
import HealthKit
import CommonCrypto
import Security

@objc(GGNativePlugin)
public class GGNativePlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "GGNativePlugin"
    public let jsName = "GGNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signInWithApple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "webAuth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "googleSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "healthAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "healthAuthorize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "healthDays", returnType: CAPPluginReturnPromise)
    ]
    private var appleCall: CAPPluginCall?
    private var webSession: ASWebAuthenticationSession?

    // MARK: Secure sign-in sheet (shares Safari's saved logins, returns straight to the app)
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.bridge?.webView?.window ?? ASPresentationAnchor()
    }
    private func openAuth(_ url: URL, scheme: String, done: @escaping (URL?, Error?) -> Void) {
        DispatchQueue.main.async {
            let s = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { cb, err in done(cb, err) }
            s.presentationContextProvider = self
            s.prefersEphemeralWebBrowserSession = false
            self.webSession = s
            if !s.start() { done(nil, NSError(domain: "GG", code: 1, userInfo: [NSLocalizedDescriptionKey: "Couldn't open the sign-in page."])) }
        }
    }
    private func authError(_ call: CAPPluginCall, _ err: Error?) {
        let cancelled = (err as? ASWebAuthenticationSessionError)?.code == .canceledLogin
        call.reject(cancelled ? "Cancelled" : (err?.localizedDescription ?? "Sign-in failed"), cancelled ? "CANCELLED" : "FAILED")
    }
    @objc func webAuth(_ call: CAPPluginCall) {
        guard let s = call.getString("url"), let url = URL(string: s), let scheme = call.getString("scheme") else { call.reject("Missing url"); return }
        openAuth(url, scheme: scheme) { cb, err in
            if let cb = cb { call.resolve(["url": cb.absoluteString]) } else { self.authError(call, err) }
        }
    }
    // Google sign-in with the app's own Google client: Google shows "GG Gains", and we get an ID token for Supabase.
    @objc func googleSignIn(_ call: CAPPluginCall) {
        guard let clientId = call.getString("clientId"), !clientId.isEmpty else { call.reject("Missing client ID"); return }
        let prefix = clientId.replacingOccurrences(of: ".apps.googleusercontent.com", with: "")
        let scheme = "com.googleusercontent.apps." + prefix
        let redirect = scheme + ":/oauth2redirect"
        var bytes = [UInt8](repeating: 0, count: 32); _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        let verifier = Data(bytes).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        let challenge = GGNativePlugin.sha256b64url(verifier)
        var c = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        c.queryItems = [URLQueryItem(name: "client_id", value: clientId), URLQueryItem(name: "redirect_uri", value: redirect),
                        URLQueryItem(name: "response_type", value: "code"), URLQueryItem(name: "scope", value: "openid email profile"),
                        URLQueryItem(name: "code_challenge", value: challenge), URLQueryItem(name: "code_challenge_method", value: "S256"),
                        URLQueryItem(name: "prompt", value: "select_account")]
        openAuth(c.url!, scheme: scheme) { cb, err in
            guard let cb = cb, let code = URLComponents(url: cb, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "code" })?.value else { self.authError(call, err); return }
            var req = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
            req.httpMethod = "POST"
            req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
            let enc = { (v: String) in v.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? v }
            req.httpBody = "code=\(enc(code))&client_id=\(enc(clientId))&redirect_uri=\(enc(redirect))&grant_type=authorization_code&code_verifier=\(enc(verifier))".data(using: .utf8)
            URLSession.shared.dataTask(with: req) { data, _, e in
                guard let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let idToken = json["id_token"] as? String else {
                    call.reject(e?.localizedDescription ?? "Google didn't return a sign-in token.", "FAILED"); return
                }
                call.resolve(["idToken": idToken])
            }.resume()
        }
    }
    static func sha256b64url(_ s: String) -> String {
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        let d = Data(s.utf8)
        d.withUnsafeBytes { _ = CC_SHA256($0.baseAddress, CC_LONG(d.count), &hash) }
        return Data(hash).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
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
        for id in [HKQuantityTypeIdentifier.stepCount, .distanceWalkingRunning, .activeEnergyBurned, .bodyMass] {
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
        // Weigh-ins (from a smart scale or another app such as a weight tracker): the last one of each day, in kg.
        if let wType = HKObjectType.quantityType(forIdentifier: .bodyMass) {
            group.enter()
            let wq = HKSampleQuery(sampleType: wType, predicate: HKQuery.predicateForSamples(withStart: start, end: end, options: []),
                                   limit: HKObjectQueryNoLimit, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]) { _, samples, _ in
                for case let smp as HKQuantitySample in samples ?? [] {
                    let kg = smp.quantity.doubleValue(for: HKUnit.gramUnit(with: .kilo))
                    let day = fmt.string(from: smp.startDate)
                    lock.lock(); out[day, default: [:]]["weightKg"] = kg; out[day, default: [:]]["weightAt"] = smp.startDate.timeIntervalSince1970; lock.unlock()
                }
                group.leave()
            }
            store.execute(wq)
        }
        group.notify(queue: .main) { call.resolve(["days": out]) }
    }
}
