import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../phone_service.dart';
import '../theme.dart';
import '../widgets.dart';
import 'dialpad_screen.dart' show prettyNumber;

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

  String get _timer {
    final d = DateTime.now().difference(phone.connectedAt ?? DateTime.now());
    return '${d.inMinutes.toString().padLeft(2, '0')}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';
  }

  String get _title => phone.name.isNotEmpty ? phone.name : (phone.number.isNotEmpty ? prettyNumber(phone.number) : 'رقم غير معروف');

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final h = MediaQuery.sizeOf(context).height - MediaQuery.paddingOf(context).vertical;
    _k = (h / 720).clamp(0.62, 1.0);
    final Widget body;
    if (phone.phase == CallPhase.ringingIn) {
      body = _incoming(c);
    } else if (_keypad && phone.phase == CallPhase.active) {
      body = _withKeypad(c);
    } else {
      body = _inCall(c);
    }
    return Scaffold(body: SafeArea(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 20), child: body)));
  }

  /// معامل تصغير للمسافات والأحجام على الشاشات القصيرة (1.0 عند ارتفاع 720 فأكثر).
  double _k = 1;
  double _s(double v) => v * _k;

  // ---------- مكالمة واردة ----------
  Widget _incoming(AppColors c) {
    final hasName = phone.name.isNotEmpty;
    return Column(
      children: [
        SizedBox(height: _s(56)),
        _Pill(text: 'مكالمة واردة', icon: Icons.phone_callback, bg: c.callContainer, fg: c.callFg),
        SizedBox(height: _s(36)),
        _Avatar(
          size: _s(112),
          bg: hasName ? c.primaryContainer : c.s3,
          child: hasName
              ? Text(phone.name.characters.first, style: TextStyle(fontSize: 44, fontWeight: FontWeight.w700, color: c.onPrimaryContainer))
              : Icon(Icons.call, size: 44, color: c.onVariant),
        ),
        SizedBox(height: _s(28)),
        _name(c),
        if (hasName) ...[
          const SizedBox(height: 6),
          Ltr(prettyNumber(phone.number), style: TextStyle(fontSize: 20, fontWeight: FontWeight.w500, color: c.onVariant)),
        ],
        const Spacer(),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            RoundAction(icon: Icons.call_end, color: c.hang, size: _s(88), tooltip: 'رفض', label: 'رفض', onTap: phone.hangUp),
            RoundAction(icon: Icons.call, color: c.call, size: _s(88), tooltip: 'رد', label: 'رد', onTap: phone.answer),
          ],
        ),
        SizedBox(height: _s(48)),
      ],
    );
  }

  // ---------- صادرة أو جارية ----------
  Widget _inCall(AppColors c) {
    final active = phone.phase == CallPhase.active;
    final Widget pill;
    final IconData avatarIcon;
    var avatarBg = c.primaryContainer;
    var avatarFg = c.onPrimaryContainer;
    if (!active) {
      final ringing = phone.phase == CallPhase.ringingOut;
      avatarIcon = ringing ? Icons.phone_in_talk : Icons.call;
      pill = ringing
          ? _Pill(text: 'يرنّ…', icon: Icons.notifications, bg: c.primaryContainer, fg: c.onPrimaryContainer)
          : _Pill(text: 'جارٍ الاتصال…', dot: c.warn, bg: c.warnContainer, fg: c.warnFg);
    } else if (phone.held) {
      avatarIcon = Icons.pause;
      avatarBg = c.s3;
      avatarFg = c.onVariant;
      pill = _Pill(text: 'في الانتظار', icon: Icons.pause, bg: c.s3, fg: c.onSurface);
    } else {
      avatarIcon = Icons.call;
      pill = _Pill(text: _timer, dot: c.call, bg: c.callContainer, fg: c.callFg, ltr: true);
    }
    return Column(
      children: [
        SizedBox(height: _s(72)),
        _Avatar(size: _s(112), bg: avatarBg, child: Icon(avatarIcon, size: 42, color: avatarFg)),
        SizedBox(height: _s(32)),
        _name(c),
        if (phone.name.isNotEmpty) ...[
          const SizedBox(height: 4),
          Ltr(prettyNumber(phone.number), style: TextStyle(fontSize: 18, color: c.onVariant)),
        ],
        SizedBox(height: _s(18)),
        pill,
        const Spacer(),
        _toggles(c),
        SizedBox(height: _s(40)),
        RoundAction(icon: Icons.call_end, color: c.hang, size: _s(80), tooltip: 'إنهاء', onTap: phone.hangUp),
        SizedBox(height: _s(56)),
      ],
    );
  }

  // ---------- جارية مع لوحة الأرقام ----------
  Widget _withKeypad(AppColors c) {
    return LayoutBuilder(
      builder: (context, box) {
        final keySize = ((box.maxHeight - 330 * _k - 40) / 4.7).clamp(40.0, 68.0);
        return Column(
          children: [
            SizedBox(height: _s(20)),
            phone.name.isNotEmpty
                ? Text(phone.name, maxLines: 1, style: TextStyle(fontSize: 19, fontWeight: FontWeight.w600, color: c.onSurface))
                : Ltr(prettyNumber(phone.number), style: TextStyle(fontSize: 19, fontWeight: FontWeight.w600, color: c.onSurface)),
            const SizedBox(height: 6),
            Directionality(
              textDirection: TextDirection.ltr,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 8, height: 8, decoration: BoxDecoration(color: c.call, shape: BoxShape.circle)),
                  const SizedBox(width: 8),
                  Text(
                    phone.held ? 'في الانتظار' : _timer,
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: c.callFg, fontFeatures: tabular),
                  ),
                ],
              ),
            ),
            SizedBox(height: _s(14)),
            SizedBox(
              height: _s(44),
              child: Ltr(_sent, align: TextAlign.center, style: TextStyle(fontSize: _s(30), fontWeight: FontWeight.w600, letterSpacing: 3, color: c.onSurface)),
            ),
            Divider(color: c.outlineVariant, indent: 12, endIndent: 12, height: 1),
            const Spacer(),
            KeyGrid(
              keySize: keySize,
              gap: _s(10),
              onKey: (k) {
                phone.sendDtmf(k);
                setState(() => _sent += k);
              },
            ),
            const Spacer(),
            _toggles(c),
            SizedBox(height: _s(18)),
            RoundAction(icon: Icons.call_end, color: c.hang, size: _s(72), tooltip: 'إنهاء', onTap: phone.hangUp),
            SizedBox(height: _s(20)),
          ],
        );
      },
    );
  }

  Widget _name(AppColors c) {
    final style = TextStyle(fontSize: _s(34), fontWeight: FontWeight.w700, color: c.onSurface);
    return FittedBox(
      fit: BoxFit.scaleDown,
      child: phone.name.isNotEmpty ? Text(_title, maxLines: 1, style: style) : Ltr(_title, style: style),
    );
  }

  Widget _toggles(AppColors c) {
    final active = phone.phase == CallPhase.active;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _Toggle(size: _s(64).clamp(48.0, 64.0), icon: Icons.mic_off, label: 'كتم', on: phone.muted, onTap: phone.toggleMute),
        _Toggle(size: _s(64).clamp(48.0, 64.0), icon: Icons.dialpad, label: 'الأرقام', on: _keypad && active, onTap: active ? () => setState(() => _keypad = !_keypad) : null),
        _Toggle(size: _s(64).clamp(48.0, 64.0), icon: Icons.volume_up, label: 'مكبّر الصوت', on: phone.speaker, onTap: phone.toggleSpeaker),
        _Toggle(size: _s(64).clamp(48.0, 64.0), icon: Icons.pause, label: 'انتظار', on: phone.held, onTap: active ? phone.toggleHold : null),
      ],
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.bg, required this.child, this.size = 112});
  final double size;
  final Color bg;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
        child: child,
      );
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text, required this.bg, required this.fg, this.icon, this.dot, this.ltr = false});
  final String text;
  final Color bg;
  final Color fg;
  final IconData? icon;
  final Color? dot;
  final bool ltr;

  @override
  Widget build(BuildContext context) {
    final row = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) Icon(icon, size: 18, color: fg),
        if (dot != null) Container(width: 9, height: 9, decoration: BoxDecoration(color: dot, shape: BoxShape.circle)),
        const SizedBox(width: 9),
        Text(text, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: fg, fontFeatures: tabular)),
      ],
    );
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: ltr ? Directionality(textDirection: TextDirection.ltr, child: row) : row,
    );
  }
}

class _Toggle extends StatelessWidget {
  const _Toggle({required this.icon, required this.label, required this.on, required this.onTap, this.size = 64});
  final double size;
  final IconData icon;
  final String label;
  final bool on;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final enabled = onTap != null;
    return Opacity(
      opacity: enabled ? 1 : 0.4,
      child: SizedBox(
        width: size + 12,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Tooltip(
              message: label,
              child: SizedBox(
                width: size,
                height: size,
                child: Material(
                  color: on ? c.primary : c.s3,
                  shape: const CircleBorder(),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(onTap: onTap, child: Icon(icon, size: 26, color: on ? c.onPrimary : c.onSurface)),
                ),
              ),
            ),
            SizedBox(height: size * 0.14),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                label,
                maxLines: 1,
                style: TextStyle(fontSize: 13, fontWeight: on ? FontWeight.w700 : FontWeight.w500, color: c.onSurface),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
