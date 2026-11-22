import 'package:material_ui/material_ui.dart';

import '../phone_service.dart';
import '../theme.dart';
import '../widgets.dart';

/// يعرض الرقم بمسافات للقراءة (050 123 4567) دون تغيير ما يُطلب فعلاً.
String prettyNumber(String n) {
  if (n.length < 8 || !RegExp(r'^[0-9]+$').hasMatch(n)) return n;
  final head = n.length - 7;
  return '${n.substring(0, head)} ${n.substring(head, head + 3)} ${n.substring(head + 3)}';
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
    final c = context.c;
    return LayoutBuilder(
      builder: (context, box) {
        // مقاس الأزرار يتبع ارتفاع الشاشة حتى لا تُقصّ على الأجهزة الصغيرة
        final keySize = ((box.maxHeight - 250) / 4.6).clamp(56.0, 84.0);
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Directionality(
                      textDirection: TextDirection.ltr,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            prettyNumber(_number),
                            maxLines: 1,
                            style: TextStyle(fontSize: 40, fontWeight: FontWeight.w600, color: c.onSurface, fontFeatures: tabular, letterSpacing: 1),
                          ),
                          Container(width: 2, height: 40, margin: const EdgeInsets.only(left: 3), color: c.primary),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              KeyGrid(
                keySize: keySize,
                onKey: (k) => setState(() => _number += k),
                onLongZero: () => setState(() => _number += '+'),
              ),
              SizedBox(height: keySize * 0.28),
              Directionality(
                textDirection: TextDirection.ltr,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(width: keySize * 1.3),
                    RoundAction(
                      icon: Icons.call,
                      color: c.call,
                      size: keySize,
                      tooltip: 'اتصال',
                      onTap: _busy ? null : _call,
                    ),
                    SizedBox(
                      width: keySize * 1.3,
                      child: _number.isEmpty
                          ? null
                          : GestureDetector(
                              onLongPress: () => setState(() => _number = ''),
                              child: IconButton(
                                tooltip: 'مسح',
                                iconSize: 28,
                                color: c.onVariant,
                                icon: const Icon(Icons.backspace),
                                onPressed: () => setState(() => _number = _number.substring(0, _number.length - 1)),
                              ),
                            ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: keySize * 0.3),
            ],
          ),
        );
      },
    );
  }
}
