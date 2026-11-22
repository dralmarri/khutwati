import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:sip_ua/sip_ua.dart' show RegistrationStateEnum;

import '../phone_service.dart';
import '../settings.dart';

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

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final sipText = phone.isRegistered
        ? 'مسجّل على الوسيط'
        : switch (phone.registration) {
            RegistrationStateEnum.REGISTRATION_FAILED => 'فشل التسجيل',
            _ => phone.settings.isConfigured ? 'غير متصل' : 'أدخل الإعدادات',
          };
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        TextField(
          controller: _domain,
          textDirection: TextDirection.ltr,
          keyboardType: TextInputType.url,
          autocorrect: false,
          decoration: const InputDecoration(
            labelText: 'اسم نطاق الوسيط',
            hintText: 'phone.example.com',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _extension,
          textDirection: TextDirection.ltr,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(
            labelText: 'رقم التحويلة',
            hintText: '300',
            helperText: 'خط البدالة الذي يستخدمه هذا الجهاز',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _password,
          textDirection: TextDirection.ltr,
          obscureText: _hide,
          autocorrect: false,
          enableSuggestions: false,
          decoration: InputDecoration(
            labelText: 'كلمة مرور التطبيق',
            helperText: 'كلمة مرور هذه التحويلة على الوسيط',
            border: const OutlineInputBorder(),
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
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(_saving ? 'جارٍ الاتصال…' : 'حفظ واتصال'),
          ),
        ),
        const SizedBox(height: 28),
        Text('الحالة', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        _StatusRow(ok: phone.isRegistered, title: 'الاتصال', detail: phone.isRegistered ? sipText : (phone.lastError ?? sipText)),
        _StatusRow(
          ok: phone.push.registered,
          title: 'إشعارات المكالمات الواردة',
          detail: phone.push.registered ? 'مفعّلة: يرنّ الهاتف والتطبيق مغلق' : (phone.push.lastError ?? 'غير مفعّلة'),
        ),
        const SizedBox(height: 16),
        Text(
          'بدون الإشعارات تصلك المكالمات الواردة والتطبيق مفتوح فقط.',
          style: TextStyle(color: scheme.onSurfaceVariant),
        ),
      ],
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.ok, required this.title, required this.detail});
  final bool ok;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(ok ? Icons.check_circle : Icons.error_outline, color: ok ? Colors.green : Theme.of(context).colorScheme.error),
      title: Text(title),
      subtitle: Text(detail),
    );
  }
}
