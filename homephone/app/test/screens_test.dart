// يبني كل شاشة في كل حالاتها على مقاسين (عادي وصغير) ويتأكد أنها لا تفيض ولا تتعطل.
// مع SHOTS=true يحفظ صوراً لها (flutter test --update-goldens --dart-define=SHOTS=true).
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:homephone/main.dart';
import 'package:homephone/phone_service.dart';
import 'package:homephone/screens/history_screen.dart';
import 'package:homephone/settings.dart';
import 'package:homephone/theme.dart';
import 'package:material_ui/material_ui.dart';

const shots = bool.fromEnvironment('SHOTS');

Future<void> loadFonts() async {
  final plex = FontLoader(appFont);
  for (final w in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
    plex.addFont(Future.value(ByteData.sublistView(File('assets/fonts/IBMPlexSansArabic-$w.ttf').readAsBytesSync())));
  }
  await plex.load();
  final icons = Platform.environment['MATERIAL_ICONS'];
  if (icons != null && File(icons).existsSync()) {
    final l = FontLoader('MaterialIcons')..addFont(Future.value(ByteData.sublistView(File(icons).readAsBytesSync())));
    await l.load();
  }
}

void reset(PhoneService p) {
  p
    ..phase = CallPhase.idle
    ..number = ''
    ..name = ''
    ..incoming = false
    ..muted = false
    ..speaker = false
    ..held = false
    ..connectedAt = null
    ..history = []
    ..debugRegistered = true
    ..settings = AppSettings(domain: 'srv.example.com', extension: '300', password: 'secret');
  p.push
    ..registered = true
    ..lastError = null;
}

void main() {
  final phone = PhoneService.instance;
  setUpAll(loadFonts);

  final now = DateTime.now();
  final states = <String, void Function()>{
    'dial-empty': () {},
    'dial-disconnected': () => phone.debugRegistered = false,
    'history': () => phone.history = [
          CallRecord(number: '0559876543', name: 'أم أحمد', kind: CallKind.outgoing, time: now),
          CallRecord(number: '0559876543', name: '', kind: CallKind.missed, time: now.subtract(const Duration(hours: 2))),
          CallRecord(number: '0112345678', name: 'جدّي أبو سالم', kind: CallKind.incoming, time: now.subtract(const Duration(days: 1))),
          CallRecord(number: '+966501234567', name: '', kind: CallKind.outgoing, time: now.subtract(const Duration(days: 3))),
          CallRecord(number: '108', name: '', kind: CallKind.incoming, time: now.subtract(const Duration(days: 30))),
        ],
    'history-empty': () {},
    'settings-ok': () {},
    'settings-error': () {
      phone.debugRegistered = false;
      phone.push
        ..registered = false
        ..lastError = 'رقم التحويلة أو كلمة المرور غير صحيحة';
    },
    'call-dialing': () => phone
      ..phase = CallPhase.dialing
      ..number = '0501234567',
    'call-ringing': () => phone
      ..phase = CallPhase.ringingOut
      ..number = '0501234567'
      ..speaker = true,
    'call-active': () => phone
      ..phase = CallPhase.active
      ..number = '0501234567'
      ..connectedAt = now.subtract(const Duration(seconds: 167))
      ..muted = true,
    'call-hold': () => phone
      ..phase = CallPhase.active
      ..number = '0501234567'
      ..connectedAt = now
      ..held = true,
    'call-keypad': () => phone
      ..phase = CallPhase.active
      ..number = '0501234567'
      ..connectedAt = now.subtract(const Duration(seconds: 185)),
    'incoming-name': () => phone
      ..phase = CallPhase.ringingIn
      ..incoming = true
      ..name = 'أم أحمد'
      ..number = '0559876543',
    'incoming-number': () => phone
      ..phase = CallPhase.ringingIn
      ..incoming = true
      ..number = '108',
  };

  const sizes = {'std': Size(360, 800), 'small': Size(320, 568)};
  for (final brightness in Brightness.values) {
    for (final size in sizes.entries) {
      for (final st in states.entries) {
        final id = '${st.key}-${size.key}-${brightness.name}';
        testWidgets(id, (tester) async {
          tester.view.physicalSize = size.value * 2;
          tester.view.devicePixelRatio = 2;
          addTearDown(tester.view.reset);
          reset(phone);
          st.value();
          await tester.pumpWidget(MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: buildTheme(brightness),
            builder: (context, child) => Directionality(textDirection: TextDirection.rtl, child: child!),
            home: const HomePage(),
          ));
          await tester.pump();
          if (st.key.startsWith('history')) {
            await tester.tap(find.text('السجل'));
          } else if (st.key.startsWith('settings')) {
            await tester.tap(find.text('الإعدادات'));
          } else if (st.key == 'dial-empty') {
            for (final k in ['0', '5', '0', '1', '2', '3', '4', '5', '6', '7']) {
              await tester.tap(find.widgetWithText(InkWell, k).first);
            }
          } else if (st.key == 'call-keypad') {
            await tester.tap(find.byIcon(Icons.dialpad));
            await tester.pump();
            await tester.tap(find.widgetWithText(InkWell, '1').first);
            await tester.tap(find.widgetWithText(InkWell, '#').first);
          }
          await tester.pump(const Duration(milliseconds: 400));
          expect(tester.takeException(), isNull);
          if (shots) await expectLater(find.byType(MaterialApp), matchesGoldenFile('shots/$id.png'));
        });
      }
    }
  }

  test('history dates read naturally', () {
    final n = DateTime(2026, 11, 22, 15, 0);
    expect(HistoryScreen.when(DateTime(2026, 11, 22, 10, 42), now: n), 'اليوم، 10:42 ص');
    expect(HistoryScreen.when(DateTime(2026, 11, 21, 19, 5), now: n), 'أمس، 7:05 م');
    expect(HistoryScreen.when(DateTime(2026, 11, 16, 0, 30), now: n), 'الإثنين، 12:30 ص');
    expect(HistoryScreen.when(DateTime(2026, 10, 1, 12, 0), now: n), '1/10/2026، 12:00 م');
  });
}
