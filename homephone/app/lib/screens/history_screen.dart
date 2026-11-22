import 'package:material_ui/material_ui.dart';

import '../phone_service.dart';
import '../settings.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key, required this.onRedial});
  final void Function(String number) onRedial;

  String _when(DateTime t) {
    final now = DateTime.now();
    final hm = '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    if (t.year == now.year && t.month == now.month && t.day == now.day) return hm;
    return '${t.day}/${t.month}/${t.year}  $hm';
  }

  @override
  Widget build(BuildContext context) {
    final phone = PhoneService.instance;
    final scheme = Theme.of(context).colorScheme;
    if (phone.history.isEmpty) {
      return Center(child: Text('لا توجد مكالمات بعد', style: TextStyle(color: scheme.onSurfaceVariant)));
    }
    return ListView.separated(
      itemCount: phone.history.length + 1,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, i) {
        if (i == phone.history.length) {
          return TextButton(onPressed: phone.clearHistory, child: const Text('مسح السجل'));
        }
        final r = phone.history[i];
        final (icon, color) = switch (r.kind) {
          CallKind.outgoing => (Icons.call_made, scheme.primary),
          CallKind.incoming => (Icons.call_received, Colors.green),
          CallKind.missed => (Icons.call_missed, scheme.error),
        };
        return ListTile(
          leading: Icon(icon, color: color),
          title: Directionality(
            textDirection: r.name.isNotEmpty ? TextDirection.rtl : TextDirection.ltr,
            child: Text(r.name.isNotEmpty ? r.name : r.number, textAlign: TextAlign.start),
          ),
          subtitle: Text(_when(r.time)),
          trailing: IconButton(icon: const Icon(Icons.call), tooltip: 'اتصال', onPressed: () => onRedial(r.number)),
        );
      },
    );
  }
}
