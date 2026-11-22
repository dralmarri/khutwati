import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:sip_ua/sip_ua.dart' show RegistrationStateEnum;

import '../phone_service.dart';
import '../settings.dart';
import '../theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final phone = PhoneService.instance;
  late final _domain = TextEditingController(text: phone.settings.domain);
  late final _extension = TextEditingController(text: phone.settings.extension);
  late final _password = TextEditingController(text: phone.settings.password);
  bool _hide = true;
  bool _saving = false;

  @override
  void dispose() {
    _domain.dispose();
    _extension.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    setState(() => _saving = true);
    await phone.applySettings(
      AppSettings(
        domain: AppSettings.cleanDomain(_domain.text),
        extension: _extension.text.trim(),
        password: _password.text.trim(),
      ),
    );
    if (mounted) setState(() => _saving = false);
  }

  // الشاشة تُنشأ مرة واحدة (const) فلا يعيد الأب بناءها: نستمع لتغيّر الحالة هنا
  @override
  Widget build(BuildContext context) => ListenableBuilder(listenable: phone, builder: (context, _) => _content(context));

  Widget _content(BuildContext context) {
    final c = context.c;
    final connecting = !phone.isRegistered && phone.isConnecting;
    final sipText = phone.isRegistered
        ? 'مسجّل على الوسيط'
        : switch (phone.registration) {
            RegistrationStateEnum.REGISTRATION_FAILED => 'فشل التسجيل',
            _ => connecting ? 'جارٍ الاتصال…' : (phone.settings.isConfigured ? 'غير متصل' : 'أدخل الإعدادات'),
          };
    const ltrInput = TextStyle(fontSize: 16, fontFeatures: tabular);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
      children: [
        TextField(
          controller: _domain,
          textDirection: TextDirection.ltr,
          style: ltrInput,
          keyboardType: TextInputType.url,
          autocorrect: false,
          decoration: const InputDecoration(labelText: 'اسم نطاق الوسيط', hintText: 'phone.example.com'),
        ),
        const SizedBox(height: 18),
        TextField(
          controller: _extension,
          textDirection: TextDirection.ltr,
          style: ltrInput,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(labelText: 'رقم التحويلة', hintText: '300', helperText: 'خط البدالة الذي يستخدمه هذا الجهاز'),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _password,
          textDirection: TextDirection.ltr,
          style: ltrInput,
          obscureText: _hide,
          autocorrect: false,
          enableSuggestions: false,
          decoration: InputDecoration(
            labelText: 'كلمة مرور التطبيق',
            helperText: 'كلمة مرور هذه التحويلة على الوسيط',
            suffixIcon: IconButton(
              icon: Icon(_hide ? Icons.visibility : Icons.visibility_off),
              tooltip: _hide ? 'إظهار' : 'إخفاء',
              onPressed: () => setState(() => _hide = !_hide),
            ),
          ),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('جارٍ الاتصال…'),
                    const SizedBox(width: 12),
                    SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.4, color: c.outline)),
                  ],
                )
              : const Text('حفظ واتصال'),
        ),
        const SizedBox(height: 26),
        Text('الحالة', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: c.primary)),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: c.s1,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: c.outlineVariant),
          ),
          child: Column(
            children: [
              _StatusRow(
                ok: phone.isRegistered,
                pending: connecting,
                title: 'الاتصال',
                detail: phone.isRegistered ? sipText : (phone.lastError ?? sipText),
              ),
              Divider(height: 1, color: c.outlineVariant),
              _StatusRow(
                ok: phone.push.registered,
                title: 'إشعارات المكالمات الواردة',
                detail: phone.push.registered ? 'مفعّلة: يرنّ الهاتف والتطبيق مغلق' : (phone.push.lastError ?? 'غير مفعّلة'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(padding: const EdgeInsets.only(top: 2), child: Icon(Icons.info, size: 17, color: c.onVariant)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'بدون الإشعارات تصلك المكالمات الواردة والتطبيق مفتوح فقط.',
                style: TextStyle(fontSize: 13, color: c.onVariant, height: 1.5),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.ok, required this.title, required this.detail, this.pending = false});
  final bool ok;
  final bool pending;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final (IconData icon, Color color) = ok
        ? (Icons.check_circle, c.call)
        : pending
            ? (Icons.sync, c.warn)
            : (Icons.warning_rounded, c.hangFg);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, color: color, size: 26),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: c.onSurface)),
                const SizedBox(height: 2),
                Text(
                  detail,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: ok ? FontWeight.w400 : FontWeight.w600,
                    color: ok ? c.onVariant : (pending ? c.warnFg : c.hangFg),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
