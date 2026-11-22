import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../phone_service.dart';
import 'dialpad_screen.dart';

class CallScreen extends StatefulWidget {
  const CallScreen({super.key});

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  final phone = PhoneService.instance;
  Timer? _ticker;
  bool _keypad = false;
  String _sent = '';

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && phone.connectedAt != null) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  String get _status {
    switch (phone.phase) {
      case CallPhase.ringingIn:
        return 'مكالمة واردة';
      case CallPhase.dialing:
        return 'جارٍ الاتصال…';
      case CallPhase.ringingOut:
        return 'يرنّ…';
      case CallPhase.active:
        if (phone.held) return 'في الانتظار';
        final d = DateTime.now().difference(phone.connectedAt ?? DateTime.now());
        final m = d.inMinutes.toString().padLeft(2, '0');
        final s = (d.inSeconds % 60).toString().padLeft(2, '0');
        return '$m:$s';
      case CallPhase.idle:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final active = phone.phase == CallPhase.active;
    final ringingIn = phone.phase == CallPhase.ringingIn;
    final title = phone.name.isNotEmpty ? phone.name : (phone.number.isNotEmpty ? phone.number : 'رقم غير معروف');

    return Scaffold(
      backgroundColor: scheme.surfaceContainerLowest,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            children: [
              const SizedBox(height: 32),
              Directionality(
                textDirection: phone.name.isNotEmpty ? TextDirection.rtl : TextDirection.ltr,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(title, maxLines: 1, style: Theme.of(context).textTheme.headlineLarge),
                ),
              ),
              if (phone.name.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Directionality(
                    textDirection: TextDirection.ltr,
                    child: Text(phone.number, style: Theme.of(context).textTheme.titleMedium),
                  ),
                ),
              const SizedBox(height: 12),
              Text(_status, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: scheme.onSurfaceVariant)),
              Expanded(
                child: Center(
                  child: _keypad
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Directionality(
                              textDirection: TextDirection.ltr,
                              child: Text(_sent, maxLines: 1, overflow: TextOverflow.fade, style: const TextStyle(fontSize: 22)),
                            ),
                            const SizedBox(height: 12),
                            KeyGrid(onKey: (k) {
                              phone.sendDtmf(k);
                              setState(() => _sent += k);
                            }),
                          ],
                        )
                      : Icon(Icons.home_rounded, size: 96, color: scheme.primary.withValues(alpha: 0.25)),
                ),
              ),
              if (!ringingIn)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _Toggle(icon: phone.muted ? Icons.mic_off : Icons.mic, label: 'كتم', on: phone.muted, onTap: phone.toggleMute),
                    _Toggle(icon: Icons.dialpad, label: 'الأرقام', on: _keypad, onTap: active ? () => setState(() => _keypad = !_keypad) : null),
                    _Toggle(icon: Icons.volume_up, label: 'مكبّر الصوت', on: phone.speaker, onTap: phone.toggleSpeaker),
                    _Toggle(icon: Icons.pause, label: 'انتظار', on: phone.held, onTap: active ? phone.toggleHold : null),
                  ],
                ),
              const SizedBox(height: 28),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  FloatingActionButton.large(
                    heroTag: 'end',
                    onPressed: phone.hangUp,
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    shape: const CircleBorder(),
                    tooltip: ringingIn ? 'رفض' : 'إنهاء',
                    child: const Icon(Icons.call_end),
                  ),
                  if (ringingIn)
                    FloatingActionButton.large(
                      heroTag: 'answer',
                      onPressed: phone.answer,
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      shape: const CircleBorder(),
                      tooltip: 'رد',
                      child: const Icon(Icons.call),
                    ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _Toggle extends StatelessWidget {
  const _Toggle({required this.icon, required this.label, required this.on, required this.onTap});
  final IconData icon;
  final String label;
  final bool on;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton.filledTonal(
          isSelected: on,
          iconSize: 28,
          padding: const EdgeInsets.all(16),
          onPressed: onTap,
          icon: Icon(icon),
          tooltip: label,
        ),
        const SizedBox(height: 6),
        Text(label, style: Theme.of(context).textTheme.labelMedium),
      ],
    );
  }
}
