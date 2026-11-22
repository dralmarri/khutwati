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
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate, PKPushRegistryDelegate, CallkitIncomingAppDelegate {
  private var voipRegistry: PKPushRegistry?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // التسجيل لإشعارات VoIP: هي التي توقظ التطبيق عند ورود مكالمة وهو مغلق
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

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
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
    let data = flutter_callkit_incoming.Data(id: id, nameCaller: name, handle: handle, type: 0)
    data.appName = "هاتف المنزل"
    data.handleType = "number"
    data.supportsVideo = false
    data.supportsHolding = true
    data.supportsDTMF = true
    data.supportsGrouping = false
    data.supportsUngrouping = false
    data.maximumCallGroups = 1
    data.maximumCallsPerCallGroup = 1
    data.audioSessionMode = "voiceChat"
    SwiftFlutterCallkitIncomingPlugin.sharedInstance?.showCallkitIncoming(data, fromPushKit: true) {
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
