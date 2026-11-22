import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import 'phone_service.dart';
import 'theme.dart';

const dialKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

/// شبكة الأرقام، تُستخدم في شاشة الاتصال وأثناء المكالمة. تبقى من اليسار لليمين دائماً.
class KeyGrid extends StatelessWidget {
  const KeyGrid({super.key, required this.onKey, this.onLongZero, this.keySize = 80, this.gap = 12});
  final void Function(String key) onKey;
  final VoidCallback? onLongZero;
  final double keySize;
  final double gap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    Widget key(String k) => SizedBox(
          width: keySize,
          height: keySize,
          child: Material(
            color: c.s2,
            shape: const CircleBorder(),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () {
                HapticFeedback.selectionClick();
                onKey(k);
              },
              onLongPress: k == '0' ? onLongZero : null,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // النجمة في الخط صغيرة ومرفوعة، فنكبّرها وننزلها لتتوسط الزر
                  Padding(
                    padding: EdgeInsets.only(top: k == '*' ? keySize * 0.2 : 0),
                    child: Text(
                      k,
                      style: TextStyle(fontSize: keySize * (k == '*' ? 0.56 : 0.38), fontWeight: FontWeight.w500, color: c.onSurface, height: 1),
                    ),
                  ),
                  if (k == '0')
                    Positioned(
                      bottom: keySize * 0.12,
                      child: Text('+', style: TextStyle(fontSize: keySize * 0.16, color: c.onVariant, height: 1)),
                    ),
                ],
              ),
            ),
          ),
        );
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var row = 0; row < 4; row++)
            Padding(
              padding: EdgeInsets.only(top: row == 0 ? 0 : gap),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (var col = 0; col < 3; col++)
                    Padding(
                      padding: EdgeInsets.only(left: col == 0 ? 0 : gap * 2.2),
                      child: key(dialKeys[row * 3 + col]),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// زر دائري كبير (اتصال، رد، إنهاء).
class RoundAction extends StatelessWidget {
  const RoundAction({super.key, required this.icon, required this.color, required this.onTap, required this.tooltip, this.size = 80, this.label});
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;
  final String tooltip;
  final double size;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final button = Tooltip(
      message: tooltip,
      child: SizedBox(
        width: size,
        height: size,
        child: Material(
          color: onTap == null ? context.c.s3 : color,
          shape: const CircleBorder(),
          elevation: onTap == null ? 0 : 2,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: Icon(icon, color: onTap == null ? context.c.outline : Colors.white, size: size * 0.42),
          ),
        ),
      ),
    );
    if (label == null) return button;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        button,
        const SizedBox(height: 10),
        Text(label!, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: context.c.onSurface)),
      ],
    );
  }
}

/// حبّة الحالة في أعلى الشاشة: متصل / جارٍ الاتصال / غير متصل.
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.phone});
  final PhoneService phone;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final (Color dot, String text) = phone.isRegistered
        ? (c.call, 'تحويلة ${phone.settings.extension}')
        : phone.isConnecting
            ? (c.warn, 'جارٍ الاتصال…')
            : (c.hang, phone.settings.isConfigured ? 'غير متصل' : 'غير مُعدّ');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: c.s1,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: c.outlineVariant),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 9, height: 9, decoration: BoxDecoration(color: dot, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Text(text, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c.onSurface, fontFeatures: tabular)),
        ],
      ),
    );
  }
}

/// ترويسة الشاشات الرئيسية: الاسم يميناً وحبّة الحالة يساراً.
class AppHeader extends StatelessWidget {
  const AppHeader({super.key, required this.phone});
  final PhoneService phone;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: Row(
        children: [
          Expanded(
            child: Text('هاتف المنزل', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: context.c.onSurface)),
          ),
          StatusPill(phone: phone),
        ],
      ),
    );
  }
}

/// رقم هاتف معروض من اليسار لليمين دائماً.
class Ltr extends StatelessWidget {
  const Ltr(this.text, {super.key, required this.style, this.align});
  final String text;
  final TextStyle style;
  final TextAlign? align;

  @override
  Widget build(BuildContext context) => Directionality(
        textDirection: TextDirection.ltr,
        child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: align, style: style.copyWith(fontFeatures: tabular)),
      );
}
