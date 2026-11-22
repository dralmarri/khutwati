import 'package:flutter_test/flutter_test.dart';
import 'package:homephone/screens/dialpad_screen.dart';
import 'package:homephone/settings.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  test('cleanDomain strips scheme and path', () {
    expect(AppSettings.cleanDomain(' https://Phone.Example.com/ws '), 'phone.example.com');
    expect(AppSettings.cleanDomain('srv1.hstgr.cloud'), 'srv1.hstgr.cloud');
  });

  test('call records survive a JSON round trip', () {
    final r = CallRecord(number: '0501234567', name: 'علي', kind: CallKind.missed, time: DateTime(2026, 1, 2, 3, 4), seconds: 7);
    final back = CallRecord.fromJson(r.toJson());
    expect([back.number, back.name, back.kind, back.time, back.seconds], [r.number, r.name, r.kind, r.time, r.seconds]);
  });

  testWidgets('dialpad builds the number and deletes digits', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Directionality(textDirection: TextDirection.rtl, child: Scaffold(body: DialpadScreen())),
    ));
    for (final k in ['1', '0', '5']) {
      await tester.tap(find.widgetWithText(InkWell, k));
    }
    await tester.pump();
    expect(find.text('105'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.backspace_outlined));
    await tester.pump();
    expect(find.text('10'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
