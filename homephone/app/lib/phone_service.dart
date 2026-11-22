import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_callkit_incoming/entities/entities.dart';
import 'package:flutter_callkit_incoming/flutter_callkit_incoming.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart' show Helper;
import 'package:permission_handler/permission_handler.dart';
import 'package:sip_ua/sip_ua.dart';
import 'package:uuid/uuid.dart';

import 'push.dart';
import 'settings.dart';

enum CallPhase { idle, ringingIn, dialing, ringingOut, active }

/// قلب التطبيق: يدير التسجيل على الوسيط، والمكالمات، وربطها بشاشة الاتصال في النظام.
///
/// المكالمة الواردة تصل من طريقين قد يسبق أحدهما الآخر:
///  - إشعار من الوسيط يُظهر شاشة الرنين (ويوقظ التطبيق إن كان مغلقاً).
///  - دعوة SIP تصل بعد أن يسجّل التطبيق.
/// نطابق بينهما بمعرّف المكالمة الذي يضعه الوسيط في الاثنين.
class PhoneService extends ChangeNotifier implements SipUaHelperListener {
  PhoneService._();
  static final PhoneService instance = PhoneService._();

  final SIPUAHelper _ua = SIPUAHelper();
  final PushRegistrar push = PushRegistrar();
  static const _uuid = Uuid();

  AppSettings settings = AppSettings();
  List<CallRecord> history = [];

  RegistrationStateEnum registration = RegistrationStateEnum.NONE;
  bool _starting = false;
  String? lastError;

  // حالة المكالمة الحالية
  CallPhase phase = CallPhase.idle;
  Call? _call;
  String? _callId; // معرّف المكالمة في شاشة النظام (والوسيط للواردة)
  bool incoming = false;
  String number = '';
  String name = '';
  bool muted = false;
  bool speaker = false;
  bool held = false;
  DateTime? connectedAt;

  bool _accepted = false; // المستخدم ضغط "رد" وقد لا تكون دعوة SIP وصلت بعد
  String? _declinedId;
  Timer? _watchdog;
  int _ticksWithoutSip = 0;

  // الحالة تُقرأ من الاتصال الحالي مباشرة. عند إعادة الاتصال تصل أحداث الاتصال القديم
  // (انقطاع) متأخرة بعد نجاح الجديد، فلا يصحّ الاعتماد على آخر حدث وصل.
  bool get isRegistered => debugRegistered ?? _ua.registered;

  /// للاختبارات فقط: يفرض حالة التسجيل دون اتصال حقيقي.
  @visibleForTesting
  bool? debugRegistered;

  /// الاتصال قيد الإنشاء (عند فتح التطبيق مثلاً، فالنظام يقطعه والتطبيق في الخلفية)
  bool get isConnecting =>
      !_ua.registered && settings.isConfigured && (_starting || _ua.connecting || _ua.connected || _resuming);

  // ---------- التهيئة والاتصال ----------

  Future<void> init() async {
    _ua.addSipUaHelperListener(this);
    settings = await AppSettings.load();
    history = await CallHistory.load();
    FlutterCallkitIncoming.onEvent.listen(_onCallkitEvent);

    // إن فُتح التطبيق بسبب مكالمة (إشعار أو ضغط "رد") نلتقطها قبل وصول الدعوة
    try {
      final active = await FlutterCallkitIncoming.activeCalls();
      if (active.isNotEmpty) {
        final c = active.last;
        _adoptRinging(c.id, c.handle ?? '', c.nameCaller ?? '');
        if (c.isAccepted == true) _accepted = true;
      }
    } catch (_) {}

    await connect();
    unawaited(push.register(settings).then((_) => notifyListeners()));
    notifyListeners();
  }

  Future<void> applySettings(AppSettings s) async {
    settings = s;
    await s.save();
    await Permission.microphone.request();
    if (Platform.isAndroid) {
      await FlutterCallkitIncoming.requestNotificationPermission({
        'title': 'الإشعارات',
        'rationaleMessagePermission': 'الإشعارات مطلوبة لإظهار المكالمات الواردة.',
        'postNotificationMessageRequired': 'فعّل الإشعارات من الإعدادات لتصلك المكالمات.',
      });
      await FlutterCallkitIncoming.requestFullIntentPermission();
    }
    await connect();
    await push.register(settings);
    notifyListeners();
  }

  Future<void> connect() async {
    if (!settings.isConfigured || _starting) return;
    _starting = true;
    try {
      final s = UaSettings()
        ..transportType = TransportType.WS
        ..webSocketUrl = 'wss://${settings.domain}/homephone/ws'
        ..uri = 'sip:${settings.extension}@${settings.domain}'
        ..authorizationUser = settings.extension
        ..password = settings.password
        ..displayName = 'HomePhone'
        ..userAgent = 'HomePhone'
        ..dtmfMode = DtmfMode.RFC2833
        ..register = true
        ..register_expires = 120;
      lastError = null;
      await _ua.start(s);
    } catch (e) {
      lastError = 'تعذّر بدء الاتصال';
      debugPrint('sip start failed: $e');
    } finally {
      _starting = false;
    }
  }

  /// يُستدعى عند عودة التطبيق للواجهة أو عند وصول إشعار: يعيد الاتصال إن كان مقطوعاً.
  void ensureConnected() {
    if (!settings.isConfigured) return;
    if (_starting || _ua.connected || _ua.connecting) return;
    unawaited(connect());
  }

  bool _resuming = false;

  void onAppResumed() {
    // مهلة قصيرة نعرض فيها "جارٍ الاتصال" بدل "غير متصل" ريثما يعود الاتصال
    _resuming = true;
    notifyListeners();
    Timer(const Duration(seconds: 6), () {
      _resuming = false;
      notifyListeners();
    });
    ensureConnected();
    if (!push.registered) unawaited(push.register(settings).then((_) => notifyListeners()));
  }

  // ---------- أفعال المستخدم ----------

  /// يبدأ مكالمة صادرة. يعيد رسالة خطأ أو null عند النجاح.
  Future<String?> dial(String target) async {
    final dest = target.replaceAll(RegExp(r'[^0-9+*#]'), '');
    if (dest.isEmpty) return 'أدخل رقماً';
    if (phase != CallPhase.idle) return 'توجد مكالمة جارية';
    if (!isRegistered) {
      ensureConnected();
      return 'غير متصل بالوسيط';
    }
    if (!await Permission.microphone.request().isGranted) return 'يجب السماح باستخدام الميكروفون';

    _resetCall();
    _callId = _uuid.v4();
    incoming = false;
    number = dest;
    phase = CallPhase.dialing;
    notifyListeners();

    // نبلّغ النظام بالمكالمة أولاً: على آيفون هو الذي يفعّل الصوت، وعلى أندرويد يبقيها حيّة في الخلفية
    await FlutterCallkitIncoming.startCall(callParams(id: _callId!, number: dest));
    final ok = await _ua.call(dest, voiceOnly: true);
    if (!ok) {
      await _finish();
      return 'تعذّر بدء المكالمة';
    }
    return null;
  }

  void answer() {
    _accepted = true;
    _answerIfPossible();
    notifyListeners();
  }

  void hangUp() {
    final c = _call;
    if (c != null) {
      try {
        c.hangup(phase == CallPhase.ringingIn ? {'status_code': 603} : null);
      } catch (_) {}
      // حدث الانتهاء من SIP يكمل التنظيف، لكن لا نبقي الشاشة معلّقة إن لم يصل
      Timer(const Duration(seconds: 3), () {
        if (identical(_call, c)) unawaited(_finish());
      });
    } else {
      if (incoming) _declinedId = _callId;
      unawaited(_finish(missed: false));
    }
  }

  void toggleMute() {
    final c = _call;
    if (c == null) return;
    muted ? c.unmute(true, false) : c.mute(true, false);
    muted = !muted;
    if (_callId != null) unawaited(FlutterCallkitIncoming.muteCall(_callId!, isMuted: muted));
    notifyListeners();
  }

  void toggleHold() {
    final c = _call;
    if (c == null || phase != CallPhase.active) return;
    held ? c.unhold() : c.hold();
    held = !held;
    if (_callId != null) unawaited(FlutterCallkitIncoming.holdCall(_callId!, isOnHold: held));
    notifyListeners();
  }

  Future<void> toggleSpeaker() async {
    speaker = !speaker;
    await Helper.setSpeakerphoneOn(speaker);
    notifyListeners();
  }

  void sendDtmf(String tone) {
    if (phase == CallPhase.active) _call?.sendDTMF(tone);
  }

  Future<void> clearHistory() async {
    history = [];
    await CallHistory.save(history);
    notifyListeners();
  }

  // ---------- أحداث شاشة الاتصال في النظام ----------

  void _onCallkitEvent(CallEvent? event) {
    switch (event) {
      case CallEventActionDidUpdateDevicePushTokenVoip():
        unawaited(push.register(settings).then((_) => notifyListeners()));
      case CallEventActionCallIncoming(:final callKitParams):
        final id = callKitParams.id;
        if (phase == CallPhase.idle || (phase == CallPhase.ringingIn && _callId == null)) {
          _adoptRinging(id, callKitParams.handle ?? '', callKitParams.nameCaller ?? '');
        }
      case CallEventActionCallAccept(:final callKitParams):
        final id = callKitParams.id;
        if (phase == CallPhase.idle) _adoptRinging(id, callKitParams.handle ?? '', callKitParams.nameCaller ?? '');
        if (_callId == id) answer();
      case CallEventActionCallDecline(:final callKitParams):
        if (callKitParams.id == _callId && phase == CallPhase.ringingIn) hangUp();
      case CallEventActionCallEnded(:final callKitParams):
        if (callKitParams.id == _callId && phase != CallPhase.idle) hangUp();
      case CallEventActionCallTimeout(:final id):
        if (id == _callId && phase == CallPhase.ringingIn) unawaited(_finish(missed: true));
      case CallEventActionCallToggleMute(:final id, :final isMuted):
        if (id == _callId && isMuted != muted) toggleMute();
      case CallEventActionCallToggleHold(:final id, :final isOnHold):
        if (id == _callId && isOnHold != held) toggleHold();
      case CallEventActionCallToggleDmtf(:final id, :final digits):
        if (id == _callId) sendDtmf(digits);
      default:
        break;
    }
  }

  /// شاشة الرنين ظاهرة (من إشعار) ولم تصل دعوة SIP بعد.
  void _adoptRinging(String id, String handle, String caller) {
    if (id == _declinedId) return;
    _callId = id;
    incoming = true;
    if (number.isEmpty) number = handle;
    if (name.isEmpty && caller != handle) name = caller;
    phase = CallPhase.ringingIn;
    ensureConnected();
    _startWatchdog();
    notifyListeners();
  }

  // ---------- أحداث SIP ----------

  @override
  void transportStateChanged(TransportState state) {
    if (!_ua.connected && !_ua.registered) registration = RegistrationStateEnum.UNREGISTERED;
    notifyListeners();
  }

  @override
  void registrationStateChanged(RegistrationState state) {
    final reported = state.state ?? RegistrationStateEnum.NONE;
    registration = _ua.registered ? RegistrationStateEnum.REGISTERED : reported;
    lastError = registration == RegistrationStateEnum.REGISTRATION_FAILED
        ? 'فشل التسجيل: تحقق من رقم التحويلة وكلمة المرور'
        : null;
    notifyListeners();
  }

  @override
  void callStateChanged(Call call, CallState state) {
    switch (state.state) {
      case CallStateEnum.CALL_INITIATION:
        if (call.direction == Direction.incoming) {
          unawaited(_onSipIncoming(call));
        } else {
          _call = call;
        }
      case CallStateEnum.PROGRESS:
        if (identical(call, _call) && !incoming) {
          phase = CallPhase.ringingOut;
          notifyListeners();
        }
      case CallStateEnum.ACCEPTED:
      case CallStateEnum.CONFIRMED:
        if (identical(call, _call) && phase != CallPhase.active) {
          phase = CallPhase.active;
          connectedAt ??= DateTime.now();
          _stopWatchdog();
          if (_callId != null) unawaited(FlutterCallkitIncoming.setCallConnected(_callId!));
          notifyListeners();
        }
      case CallStateEnum.ENDED:
      case CallStateEnum.FAILED:
        if (identical(call, _call)) _onSipEnded();
      default:
        break;
    }
  }

  Future<void> _onSipIncoming(Call call) async {
    final headerId = _headerCallId(call);
    final busyWithOther = _call != null || (phase != CallPhase.idle && phase != CallPhase.ringingIn);
    final declined = headerId != null && headerId == _declinedId;
    final otherRinging = phase == CallPhase.ringingIn && _callId != null && headerId != null && headerId != _callId;
    if (busyWithOther || declined || otherRinging) {
      try {
        call.hangup({'status_code': declined ? 603 : 486});
      } catch (_) {}
      return;
    }

    _call = call;
    incoming = true;
    _ticksWithoutSip = 0;
    final sipNumber = call.remote_identity ?? '';
    final sipName = call.remote_display_name ?? '';
    if (sipNumber.isNotEmpty) number = sipNumber;
    if (sipName.isNotEmpty && sipName != sipNumber) name = sipName;
    phase = CallPhase.ringingIn;
    notifyListeners();

    if (_callId == null) {
      // الدعوة سبقت الإشعار: ننتظره قليلاً حتى لا تظهر شاشتا رنين للمكالمة نفسها
      await Future<void>.delayed(const Duration(milliseconds: 1500));
      if (!identical(_call, call)) return;
      if (_callId == null) {
        _callId = headerId ?? _uuid.v4();
        await FlutterCallkitIncoming.showCallkitIncoming(callParams(id: _callId!, number: number, name: name));
      }
    }
    _startWatchdog();
    _answerIfPossible();
  }

  String? _headerCallId(Call call) {
    try {
      final v = call.session.request?.getHeader('X-HP-Call-ID');
      return (v is String && v.isNotEmpty) ? v : null;
    } catch (_) {
      return null;
    }
  }

  void _answerIfPossible() {
    final c = _call;
    if (!_accepted || c == null || !incoming || phase != CallPhase.ringingIn) return;
    try {
      c.answer(_ua.buildCallOptions(true));
    } catch (e) {
      debugPrint('answer failed: $e');
      unawaited(_finish());
    }
  }

  void _onSipEnded() {
    if (incoming && connectedAt == null && !_accepted) {
      // أُلغيت الدعوة قبل الرد. الوسيط قد يعيد إرسالها بعد لحظات (عند تسجيل جهاز آخر)،
      // لذلك نبقي شاشة الرنين ونترك المراقب يقرر من حالة المكالمة لدى الوسيط.
      _call = null;
      _ticksWithoutSip = 0;
      _startWatchdog();
      return;
    }
    unawaited(_finish());
  }

  // ---------- مراقبة الرنين ----------

  void _startWatchdog() {
    _watchdog ??= Timer.periodic(const Duration(seconds: 2), (_) => _watch());
  }

  void _stopWatchdog() {
    _watchdog?.cancel();
    _watchdog = null;
  }

  Future<void> _watch() async {
    final id = _callId;
    if (phase != CallPhase.ringingIn || id == null) {
      _stopWatchdog();
      return;
    }
    if (_call == null) {
      _ticksWithoutSip++;
      ensureConnected();
    }
    final status = await PushRegistrar.callStatus(settings, id);
    if (id != _callId || phase != CallPhase.ringingIn) return;
    final waited = _ticksWithoutSip * 2;
    // "ended" = رُدّ عليها من جهاز آخر أو أغلق المتصل. وإن تعذّر السؤال ولم تصل دعوة نكتفي بمهلة.
    final over = status == 'ended' && (_call == null || !_accepted);
    final lost = _call == null && (status == null ? waited >= 12 : waited >= 60);
    if (over || lost) await _finish(missed: !_accepted);
  }

  // ---------- إنهاء وتنظيف ----------

  Future<void> _finish({bool? missed}) async {
    final id = _callId;
    if (phase == CallPhase.idle && id == null) return;
    _stopWatchdog();

    final wasMissed = missed ?? (incoming && connectedAt == null && !_accepted);
    if (number.isNotEmpty) {
      history.insert(
        0,
        CallRecord(
          number: number,
          name: name,
          kind: !incoming ? CallKind.outgoing : (wasMissed ? CallKind.missed : CallKind.incoming),
          time: DateTime.now(),
          seconds: connectedAt == null ? 0 : DateTime.now().difference(connectedAt!).inSeconds,
        ),
      );
      unawaited(CallHistory.save(history));
    }

    final wasSpeaker = speaker;
    _resetCall();
    notifyListeners();
    if (wasSpeaker) {
      try {
        await Helper.setSpeakerphoneOn(false);
      } catch (_) {}
    }
    if (id != null) {
      try {
        await FlutterCallkitIncoming.endCall(id);
      } catch (_) {}
    }
  }

  void _resetCall() {
    _call = null;
    _callId = null;
    phase = CallPhase.idle;
    incoming = false;
    number = '';
    name = '';
    muted = false;
    speaker = false;
    held = false;
    connectedAt = null;
    _accepted = false;
    _ticksWithoutSip = 0;
  }

  @override
  void onNewMessage(SIPMessageRequest msg) {}

  @override
  void onNewNotify(Notify ntf) {}

  @override
  void onNewReinvite(ReInvite event) {}
}
