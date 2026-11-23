import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// إعدادات الاتصال بالوسيط. كلمة المرور تُحفظ في مخزن النظام الآمن.
class AppSettings {
  AppSettings({this.domain = '', this.extension = '', this.password = '', this.enabled = true, this.prefix = ''});

  String domain;

  /// رقم التحويلة في البدالة التي يستخدمها هذا الجهاز (مثل 300)
  String extension;
  String password;

  /// الخدمة مفعّلة: التطبيق مسجّل على الوسيط ويستقبل المكالمات. عند الإيقاف لا يرنّ ولا يتصل.
  bool enabled;

  /// بادئة الخط الخارجي في البدالة (مثل 9)، تُضاف قبل أرقام جهات الاتصال. فارغة إن لم تُطلب.
  String prefix;

  bool get isConfigured => domain.isNotEmpty && extension.isNotEmpty && password.isNotEmpty;

  /// ترويسة التوثيق لدى خدمة الإشعارات في الوسيط
  String get bearer => 'Bearer $extension:$password';

  static const _secure = FlutterSecureStorage();

  // يجب أن تُقرأ كلمة المرور والهاتف مقفل، حتى يسجّل التطبيق عند ورود مكالمة
  static const _ios = IOSOptions(accessibility: KeychainAccessibility.first_unlock);

  static Future<AppSettings> load() async {
    final prefs = await SharedPreferences.getInstance();
    String password = '';
    try {
      password = await _secure.read(key: 'password', iOptions: _ios) ?? '';
    } catch (_) {
      // المخزن الآمن غير متاح قبل أول فتح للقفل بعد إعادة التشغيل
    }
    return AppSettings(
      domain: prefs.getString('domain') ?? '',
      extension: prefs.getString('extension') ?? '',
      password: password,
      enabled: prefs.getBool('enabled') ?? true,
      prefix: prefs.getString('prefix') ?? '',
    );
  }

  Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('domain', domain);
    await prefs.setString('extension', extension);
    await prefs.setBool('enabled', enabled);
    await prefs.setString('prefix', prefix);
    await _secure.write(
      key: 'password',
      value: password,
      iOptions: _ios,
    );
  }

  /// يقبل "example.com" أو "https://example.com/" ويعيد اسم النطاق فقط.
  static String cleanDomain(String input) {
    var d = input.trim();
    d = d.replaceFirst(RegExp(r'^[a-zA-Z]+://'), '');
    final slash = d.indexOf('/');
    if (slash >= 0) d = d.substring(0, slash);
    return d.toLowerCase();
  }
}

enum CallKind { outgoing, incoming, missed }

class CallRecord {
  CallRecord({required this.number, required this.name, required this.kind, required this.time, this.seconds = 0, this.id = ''});

  /// معرّف المكالمة لدى الوسيط (للواردة)، لمنع تكرارها عند مزامنة الفائتة
  final String id;

  final String number;
  final String name;
  final CallKind kind;
  final DateTime time;
  final int seconds;

  Map<String, dynamic> toJson() => {
        'number': number,
        'name': name,
        'kind': kind.name,
        'time': time.millisecondsSinceEpoch,
        'seconds': seconds,
        if (id.isNotEmpty) 'id': id,
      };

  static CallRecord fromJson(Map<String, dynamic> j) => CallRecord(
        number: j['number'] as String? ?? '',
        name: j['name'] as String? ?? '',
        kind: CallKind.values.firstWhere((k) => k.name == j['kind'], orElse: () => CallKind.outgoing),
        time: DateTime.fromMillisecondsSinceEpoch(j['time'] as int? ?? 0),
        seconds: j['seconds'] as int? ?? 0,
        id: j['id'] as String? ?? '',
      );
}

class CallHistory {
  static const _key = 'history';
  static const _max = 200;

  static Future<List<CallRecord>> load() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final list = jsonDecode(prefs.getString(_key) ?? '[]') as List<dynamic>;
      return list.map((e) => CallRecord.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> save(List<CallRecord> records) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(records.take(_max).map((r) => r.toJson()).toList()));
  }
}
