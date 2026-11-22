import 'package:flutter_test/flutter_test.dart';
import 'package:homephone/screens/dialpad_screen.dart';
import 'package:homephone/settings.dart';

void main() {
  test('cleanDomain strips scheme and path', () {
    expect(AppSettings.cleanDomain(' https://Phone.Example.com/ws '), 'phone.example.com');
    expect(AppSettings.cleanDomain('srv1.hstgr.cloud'), 'srv1.hstgr.cloud');
  });

  test('settings need domain, extension and password', () {
    expect(AppSettings(domain: 'a.example', password: 'p').isConfigured, isFalse);
    final s = AppSettings(domain: 'a.example', extension: '301', password: 'p');
    expect(s.isConfigured, isTrue);
    expect(s.bearer, 'Bearer 301:p');
  });

  test('call records survive a JSON round trip', () {
    final r = CallRecord(number: '0501234567', name: 'علي', kind: CallKind.missed, time: DateTime(2026, 1, 2, 3, 4), seconds: 7);
    final back = CallRecord.fromJson(r.toJson());
    expect([back.number, back.name, back.kind, back.time, back.seconds], [r.number, r.name, r.kind, r.time, r.seconds]);
  });

  test('prettyNumber groups long numbers only', () {
    expect(prettyNumber('0501234567'), '050 123 4567');
    expect(prettyNumber('108'), '108');
    expect(prettyNumber('+966501234567'), '+966501234567');
  });
}
