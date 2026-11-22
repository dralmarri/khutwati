import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';

import '../phone_service.dart';

const dialKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

/// شبكة الأرقام، تُستخدم في شاشة الاتصال وأثناء المكالمة. تبقى من اليسار لليمين دائماً.
class KeyGrid extends StatelessWidget {
  const KeyGrid({super.key, required this.onKey, this.onLongZero});
  final void Function(String key) onKey;
  final VoidCallback? onLongZero;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Directionality(
      textDirection: TextDirection.ltr,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 20,
          childAspectRatio: 1.25,
          children: [
            for (final k in dialKeys)
              Material(
                color: scheme.surfaceContainerHighest,
                shape: const StadiumBorder(),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    onKey(k);
                  },
                  onLongPress: k == '0' ? onLongZero : null,
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(k, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w500)),
                        if (k == '0' && onLongZero != null) Text('+', style: TextStyle(color: scheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class DialpadScreen extends StatefulWidget {
  const DialpadScreen({super.key});

  @override
  State<DialpadScreen> createState() => DialpadScreenState();
}

class DialpadScreenState extends State<DialpadScreen> {
  String _number = '';
  bool _busy = false;

  void setNumber(String n) => setState(() => _number = n);

  Future<void> _call() async {
    if (_busy) return;
    setState(() => _busy = true);
    final error = await PhoneService.instance.dial(_number);
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (error == null) _number = '';
    });
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Directionality(
                    textDirection: TextDirection.ltr,
                    child: Text(
                      _number.isEmpty ? ' ' : _number,
                      maxLines: 1,
                      style: const TextStyle(fontSize: 38, letterSpacing: 1.5),
                    ),
                  ),
                ),
              ),
            ),
            KeyGrid(
              onKey: (k) => setState(() => _number += k),
              onLongZero: () => setState(() => _number += '+'),
            ),
            const SizedBox(height: 20),
            Directionality(
              textDirection: TextDirection.ltr,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(width: 72),
                  FloatingActionButton.large(
                    heroTag: 'call',
                    onPressed: _number.isEmpty || _busy ? null : _call,
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    shape: const CircleBorder(),
                    tooltip: 'اتصال',
                    child: const Icon(Icons.call),
                  ),
                  SizedBox(
                    width: 72,
                    child: _number.isEmpty
                        ? null
                        : GestureDetector(
                            onLongPress: () => setState(() => _number = ''),
                            child: IconButton(
                              tooltip: 'مسح',
                              icon: const Icon(Icons.backspace_outlined),
                              onPressed: () => setState(() => _number = _number.substring(0, _number.length - 1)),
                            ),
                          ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
