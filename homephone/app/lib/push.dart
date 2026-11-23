import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_callkit_incoming/entities/entities.dart';
import 'package:flutter_callkit_incoming/flutter_callkit_incoming.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'settings.dart';

const missedSubtitle = 'مكالمة فائتة على هاتف المنزل';

/// شكل شاشة المكالمة الواردة (نفسه سواء جاءت من الإشعار أو من دعوة SIP مباشرة).
CallKitParams callParams({required String id, required String number, String name = ''}) {
  return CallKitParams(
    id: id,
    nameCaller: name.isNotEmpty ? name : number,
    appName: 'هاتف المنزل',
    handle: number,
    type: 0,
    duration: 60000,
    missedCallNotification: NotificationParams(showNotification: true, subtitle: missedSubtitle, isShowCallback: false),
    android: const AndroidParams(
      isCustomNotification: false,
      isShowFullLockedScreen: true,
      isImportant: true,
      textAccept: 'رد',
      textDecline: 'رفض',
      ringtonePath: 'system_ringtone_default',
      backgroundColor: '#0B5D57',
      actionColor: '#2E7D32',
      incomingCallNotificationChannelName: 'مكالمات واردة',
      missedCallNotificationChannelName: 'مكالمات فائتة',
    ),
    ios: const IOSParams(
      handleType: 'number',
      normalHandle: 1, // الرقم يُعرض كما هو في شاشة الاتصال وسجل الهاتف
      supportsVideo: false,
      maximumCallGroups: 1,
      maximumCallsPerCallGroup: 1,
      supportsDTMF: true,
      supportsHolding: true,
      supportsGrouping: false,
      supportsUngrouping: false,
      audioSessionMode: 'voiceChat',
      audioSessionActive: true,
      ringtonePath: 'system_ringtone_default',
    ),
  );
}

/// يعالج إشعار FCM على أندرويد. يعمل في الواجهة وفي الخلفية (حتى والتطبيق مغلق).
Future<void> handleFcmData(Map<String, dynamic> data) async {
  final id = data['id'] as String?;
  if (id == null || id.isEmpty) return;
  if (data['type'] == 'call') {
    await FlutterCallkitIncoming.showCallkitIncoming(
      callParams(id: id, number: data['handle'] as String? ?? '', name: data['nameCaller'] as String? ?? ''),
    );
  } else if (data['type'] == 'cancel') {
    // الإلغاء يصل لكل الأجهزة عند الرد على أحدها، فلا ننهي المكالمة على الجهاز الذي ردّ
    final active = await FlutterCallkitIncoming.activeCalls();
    final mine = active.where((c) => c.id == id);
    if (mine.isNotEmpty && mine.first.isAccepted == true) return;
    await FlutterCallkitIncoming.endCall(id);
    // أغلق المتصل قبل أن يردّ أحد: إشعار مكالمة فائتة (يعمل والتطبيق مغلق)
    // إلا إن كان المستخدم هو من رفضها على هذا الجهاز
    final prefs = await SharedPreferences.getInstance();
    await prefs.reload();
    if (data['missed'] == '1' && prefs.getString('declinedId') != id) {
      await FlutterCallkitIncoming.showMissCallNotification(
        callParams(id: id, number: data['handle'] as String? ?? '', name: data['nameCaller'] as String? ?? ''),
      );
    }
  }
}

@pragma('vm:entry-point')
Future<void> fcmBackgroundHandler(RemoteMessage message) async {
  await handleFcmData(message.data);
}

/// تسجيل رمز الإشعارات لدى الوسيط.
class PushRegistrar {
  String? lastError;
  bool registered = false;
  bool _fcmReady = false;

  Future<void> _initFcm() async {
    if (_fcmReady) return;
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(fcmBackgroundHandler);
    FirebaseMessaging.onMessage.listen((m) => handleFcmData(m.data));
    _fcmReady = true;
  }

  Future<String?> _token() async {
    if (Platform.isIOS) {
      final t = await FlutterCallkitIncoming.getDevicePushTokenVoIP();
      return (t == null || t.isEmpty) ? null : t;
    }
    if (Platform.isAndroid) {
      await _initFcm();
      return FirebaseMessaging.instance.getToken();
    }
    return null;
  }

  Future<void> register(AppSettings settings) async {
    if (!settings.isConfigured) return;
    try {
      final token = await _token();
      if (token == null) {
        lastError = 'لم يصل رمز الإشعارات من النظام بعد';
        registered = false;
        return;
      }
      final res = await http
          .post(
            Uri.https(settings.domain, '/homephone/api/devices'),
            headers: {'authorization': settings.bearer, 'content-type': 'application/json'},
            body: jsonEncode({'platform': Platform.isIOS ? 'ios' : 'android', 'token': token}),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode != 200) {
        registered = false;
        lastError = switch (res.statusCode) {
          401 => 'رقم التحويلة أو كلمة المرور غير صحيحة',
          >= 500 => 'عطل في خدمة الإشعارات على الوسيط (${res.statusCode})',
          _ => 'الوسيط رفض التسجيل (${res.statusCode})',
        };
        return;
      }
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      registered = body['push'] == true;
      lastError = registered ? null : 'الإشعارات غير مفعّلة على الوسيط لهذا النظام';
    } catch (e) {
      registered = false;
      lastError = Platform.isAndroid && !_fcmReady ? 'Firebase غير مهيّأ في هذه النسخة' : 'تعذّر الوصول إلى الوسيط';
      debugPrint('push register failed: $e');
    }
  }

  /// يزيل هذا الجهاز من قائمة الإشعارات لدى الوسيط (عند إيقاف الخدمة) فلا يوقظه أي اتصال.
  Future<bool> unregister(AppSettings settings) async {
    registered = false;
    lastError = null;
    if (!settings.isConfigured) return true;
    try {
      final token = await _token();
      if (token == null) return true;
      final req = http.Request('DELETE', Uri.https(settings.domain, '/homephone/api/devices'))
        ..headers.addAll({'authorization': settings.bearer, 'content-type': 'application/json'})
        ..body = jsonEncode({'token': token});
      final res = await req.send().timeout(const Duration(seconds: 10));
      return res.statusCode == 200;
    } catch (e) {
      debugPrint('push unregister failed: $e');
      return false;
    }
  }

  /// المكالمات التي فاتت هذه التحويلة منذ [since]، كما سجّلها الوسيط. null إن تعذّر السؤال.
  static Future<({List<Map<String, dynamic>> calls, int now})?> missedSince(AppSettings settings, int since) async {
    try {
      final res = await http
          .get(Uri.https(settings.domain, '/homephone/api/missed', {'since': '$since'}), headers: {'authorization': settings.bearer})
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return (
        calls: (body['calls'] as List<dynamic>).cast<Map<String, dynamic>>(),
        now: body['now'] as int? ?? DateTime.now().millisecondsSinceEpoch,
      );
    } catch (_) {
      return null;
    }
  }

  /// حالة مكالمة واردة لدى الوسيط: "ringing" أو "ended"، أو null إذا تعذّر السؤال.
  static Future<String?> callStatus(AppSettings settings, String id) async {
    try {
      final res = await http
          .get(Uri.https(settings.domain, '/homephone/api/calls/$id'), headers: {'authorization': settings.bearer})
          .timeout(const Duration(seconds: 4));
      if (res.statusCode != 200) return null;
      return (jsonDecode(res.body) as Map<String, dynamic>)['status'] as String?;
    } catch (_) {
      return null;
    }
  }
}
