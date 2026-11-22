import AVFAudio
import CallKit
import Flutter
import PushKit
import UIKit
import flutter_callkit_incoming

#if canImport(WebRTC)
import WebRTC
#endif

@main
@objc class AppDelegate: FlutterAppDelegate, PKPushRegistryDelegate, CallkitIncomingAppDelegate {
  private var voipRegistry: PKPushRegistry?

  // المحرّك يُنشأ ويُشغَّل هنا عند الإقلاع، لا عند ظهور الواجهة.
  // حين يوقظ إشعار مكالمة التطبيقَ وهو مغلق لا تُفتح أي واجهة، فلو انتظرنا الواجهة
  // لما وُجدت إضافة المكالمات لتُظهر شاشة الرنين، ولما اشتغل كود التسجيل على الوسيط.
  lazy var flutterEngine = FlutterEngine(name: "homephone")

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    flutterEngine.run()
    GeneratedPluginRegistrant.register(with: flutterEngine)
    // نافذة تحمل الواجهة؛ FlutterSceneDelegate ينقلها إلى المشهد عند فتح التطبيق
    let window = UIWindow(frame: UIScreen.main.bounds)
    window.rootViewController = FlutterViewController(engine: flutterEngine, nibName: nil, bundle: nil)
    self.window = window

    // التسجيل لإشعارات VoIP (بعد تسجيل الإضافات حتى تكون جاهزة عند وصول أول إشعار): هي التي توقظ التطبيق عند ورود مكالمة وهو مغلق
    let registry = PKPushRegistry(queue: DispatchQueue.main)
    registry.delegate = self
    registry.desiredPushTypes = [.voIP]
    voipRegistry = registry

    // الصوت يُفعَّل فقط عندما يسلّمنا النظام جلسة الصوت (عند الرد أو بدء الاتصال)
    #if canImport(WebRTC)
    RTCAudioSession.sharedInstance().useManualAudio = true
    RTCAudioSession.sharedInstance().isAudioEnabled = false
    #endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // MARK: - PushKit

  func pushRegistry(_ registry: PKPushRegistry, didUpdate credentials: PKPushCredentials, for type: PKPushType) {
    let token = credentials.token.map { String(format: "%02x", $0) }.joined()
    SwiftFlutterCallkitIncomingPlugin.sharedInstance?.setDevicePushTokenVoIP(token)
  }

  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    SwiftFlutterCallkitIncomingPlugin.sharedInstance?.setDevicePushTokenVoIP("")
  }

  func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    guard type == .voIP else {
      completion()
      return
    }
    // النظام يشترط إظهار شاشة المكالمة فور وصول كل إشعار VoIP
    let info = payload.dictionaryPayload
    let id = info["id"] as? String ?? UUID().uuidString
    let handle = info["handle"] as? String ?? ""
    let name = info["nameCaller"] as? String ?? handle
    guard let callkit = SwiftFlutterCallkitIncomingPlugin.sharedInstance else {
      NSLog("[HomePhone] VoIP push received but the call plugin is not ready")
      completion()
      return
    }
    let data = flutter_callkit_incoming.Data(id: id, nameCaller: name, handle: handle, type: 0)
    data.appName = "هاتف المنزل"
    data.handleType = "number"
    data.normalHandle = 1
    data.supportsVideo = false
    data.supportsHolding = true
    data.supportsDTMF = true
    data.supportsGrouping = false
    data.supportsUngrouping = false
    data.maximumCallGroups = 1
    data.maximumCallsPerCallGroup = 1
    data.audioSessionMode = "voiceChat"
    callkit.showCallkitIncoming(data, fromPushKit: true) {
      completion()
    }
  }

  // MARK: - CallkitIncomingAppDelegate
  // منطق المكالمة كله في Dart (يصله الحدث نفسه)، وهنا نؤكّد الإجراء للنظام فقط.

  func onAccept(_ call: Call, _ action: CXAnswerCallAction) { action.fulfill() }
  func onDecline(_ call: Call, _ action: CXEndCallAction) { action.fulfill() }
  func onEnd(_ call: Call, _ action: CXEndCallAction) { action.fulfill() }
  func onTimeOut(_ call: Call) {}
  func providerDidReset() {}

  func didActivateAudioSession(_ audioSession: AVAudioSession) {
    #if canImport(WebRTC)
    RTCAudioSession.sharedInstance().audioSessionDidActivate(audioSession)
    RTCAudioSession.sharedInstance().isAudioEnabled = true
    #endif
  }

  func didDeactivateAudioSession(_ audioSession: AVAudioSession) {
    #if canImport(WebRTC)
    RTCAudioSession.sharedInstance().audioSessionDidDeactivate(audioSession)
    RTCAudioSession.sharedInstance().isAudioEnabled = false
    #endif
  }
}
