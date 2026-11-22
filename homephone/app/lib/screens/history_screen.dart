import 'package:material_ui/material_ui.dart';

import '../phone_service.dart';
import '../settings.dart';
import '../theme.dart';
import '../widgets.dart';
import 'dialpad_screen.dart' show prettyNumber;

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key, required this.onRedial});
  final void Function(String number) onRedial;

  static const _days = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

  /// "اليوم، 10:42 ص" أو "أمس، ..." أو اسم اليوم خلال أسبوع، ثم التاريخ.
  static String when(DateTime t, {DateTime? now}) {
    now ??= DateTime.now();
    final h = t.hour % 12 == 0 ? 12 : t.hour % 12;
    final time = '$h:${t.minute.toString().padLeft(2, '0')} ${t.hour < 12 ? 'ص' : 'م'}';
    final days = DateTime(now.year, now.month, now.day).difference(DateTime(t.year, t.month, t.day)).inDays;
    final day = switch (days) {
      0 => 'اليوم',
      1 => 'أمس',
      < 7 => _days[t.weekday - 1],
      _ => '${t.day}/${t.month}/${t.year}',
    };
    return '$day، $time';
  }

  @override
  Widget build(BuildContext context) {
    final phone = PhoneService.instance;
    final c = context.c;
    if (phone.history.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(color: c.s2, shape: BoxShape.circle),
              child: Icon(Icons.history, size: 44, color: c.onVariant),
            ),
            const SizedBox(height: 24),
            Text('لا توجد مكالمات بعد', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w500, color: c.onVariant)),
            const SizedBox(height: 80),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.only(top: 4, bottom: 16),
      itemCount: phone.history.length + 1,
      itemBuilder: (context, i) {
        if (i == phone.history.length) {
          return Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Center(
              child: TextButton.icon(
                onPressed: phone.clearHistory,
                icon: Icon(Icons.delete_outline, color: c.hangFg, size: 20),
                label: Text('مسح السجل', style: TextStyle(color: c.hangFg, fontWeight: FontWeight.w600, fontSize: 15)),
              ),
            ),
          );
        }
        final r = phone.history[i];
        final missed = r.kind == CallKind.missed;
        final (IconData icon, Color bg, Color fg, String kind) = switch (r.kind) {
          CallKind.outgoing => (Icons.call_made, c.primaryContainer, c.primary, 'صادرة'),
          CallKind.incoming => (Icons.call_received, c.callContainer, c.callFg, 'واردة'),
          CallKind.missed => (Icons.call_missed, c.hangContainer, c.hangFg, 'فائتة'),
        };
        final titleStyle = TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: missed ? c.hangFg : c.onSurface);
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
                child: Icon(icon, size: 22, color: fg),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    r.name.isNotEmpty
                        ? Text(r.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: titleStyle)
                        : Ltr(prettyNumber(r.number), style: titleStyle),
                    const SizedBox(height: 2),
                    Text('$kind · ${when(r.time)}', style: TextStyle(fontSize: 13, color: c.onVariant, fontFeatures: tabular)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              IconButton.outlined(
                tooltip: 'اتصال',
                onPressed: () => onRedial(r.number),
                style: IconButton.styleFrom(side: BorderSide(color: c.outlineVariant), fixedSize: const Size(48, 48)),
                icon: Icon(Icons.call, color: c.callFg, size: 22),
              ),
            ],
          ),
        );
      },
    );
  }
}
