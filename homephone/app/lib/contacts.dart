import 'package:flutter/foundation.dart';
import 'package:flutter_contacts/flutter_contacts.dart';

class ContactEntry {
  const ContactEntry(this.name, this.numbers);
  final String name;
  final List<String> numbers;
}

enum ContactsState { unknown, loading, ready, denied }

/// جهات الاتصال في الجوال: للقراءة فقط. تُستعمل للاتصال من القائمة ولعرض اسم المتصل.
class ContactsStore extends ChangeNotifier {
  ContactsStore._();
  static final ContactsStore instance = ContactsStore._();

  ContactsState state = ContactsState.unknown;
  List<ContactEntry> entries = [];
  final Map<String, String> _byKey = {};

  /// يحمّل الأسماء. [ask] = اطلب الإذن إن لم يُمنح بعد (نطلبه عند فتح التبويب، لا عند الإقلاع).
  Future<void> load({bool ask = false}) async {
    if (state == ContactsState.loading) return;
    try {
      var status = await FlutterContacts.permissions.check(PermissionType.read);
      final granted = {PermissionStatus.granted, PermissionStatus.limited};
      if (!granted.contains(status)) {
        if (!ask) return;
        status = await FlutterContacts.permissions.request(PermissionType.read);
        if (!granted.contains(status)) {
          state = ContactsState.denied;
          notifyListeners();
          return;
        }
      }
      state = ContactsState.loading;
      notifyListeners();
      final all = await FlutterContacts.getAll(properties: {ContactProperty.name, ContactProperty.phone});
      setEntries([
        for (final c in all)
          if (c.phones.isNotEmpty) ContactEntry((c.displayName ?? '').trim(), [for (final p in c.phones) p.number]),
      ]);
    } catch (e) {
      debugPrint('contacts load failed: $e');
      if (state == ContactsState.loading) state = ContactsState.unknown;
      notifyListeners();
    }
  }

  @visibleForTesting
  void setEntries(List<ContactEntry> list) {
    entries = list.where((e) => e.name.isNotEmpty).toList()..sort((a, b) => a.name.compareTo(b.name));
    _byKey.clear();
    for (final e in entries) {
      for (final n in e.numbers) {
        final k = matchKey(n);
        if (k.isNotEmpty) _byKey.putIfAbsent(k, () => e.name);
      }
    }
    state = ContactsState.ready;
    notifyListeners();
  }

  /// اسم صاحب الرقم إن وُجد في جهات الاتصال.
  String? nameFor(String number) {
    final k = matchKey(number);
    return k.isEmpty ? null : _byKey[k];
  }

  /// مفتاح المطابقة: آخر 8 أرقام (طول الرقم المحلي)، حتى يتطابق 23741020 مع +965 2374 1020.
  /// الأرقام القصيرة (تحويلات داخلية) تُطابَق كاملة.
  static String matchKey(String number) {
    final digits = number.replaceAll(RegExp(r'[^0-9]'), '');
    return digits.length > 8 ? digits.substring(digits.length - 8) : digits;
  }

  /// يحوّل رقماً مكتوباً في جهات الاتصال إلى ما يُطلب من البدالة:
  /// يحذف الرموز والمسافات ومفتاح الكويت، ويضيف بادئة الخط الخارجي للأرقام الخارجية.
  static String dialable(String number, {String prefix = ''}) {
    var n = number.replaceAll(RegExp(r'[^0-9+*#]'), '');
    if (n.startsWith('+965')) {
      n = n.substring(4);
    } else if (n.startsWith('00965')) {
      n = n.substring(5);
    } else if (n.startsWith('+')) {
      n = '00${n.substring(1)}';
    }
    final external = n.length >= 7 && !n.contains('*') && !n.contains('#');
    return external ? '$prefix$n' : n;
  }
}
