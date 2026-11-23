import 'package:material_ui/material_ui.dart';

import '../contacts.dart';
import '../theme.dart';
import '../widgets.dart';

class ContactsScreen extends StatefulWidget {
  const ContactsScreen({super.key, required this.onPick});

  /// يُستدعى بالرقم الجاهز للطلب، فيوضع في لوحة الاتصال.
  final void Function(String number) onPick;

  @override
  State<ContactsScreen> createState() => ContactsScreenState();
}

class ContactsScreenState extends State<ContactsScreen> {
  final store = ContactsStore.instance;
  final _search = TextEditingController();
  String _q = '';

  /// يُستدعى عند فتح التبويب: هنا نطلب إذن جهات الاتصال لأول مرة.
  void opened() {
    if (store.state == ContactsState.unknown) store.load(ask: true);
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _pick(ContactEntry e) {
    if (e.numbers.length == 1) {
      widget.onPick(ContactsStore.dialable(e.numbers.first));
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(e.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            ),
            for (final n in e.numbers)
              ListTile(
                leading: Icon(Icons.call, color: context.c.callFg),
                title: Ltr(n, align: TextAlign.end, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w500)),
                onTap: () {
                  Navigator.pop(sheet);
                  widget.onPick(ContactsStore.dialable(n));
                },
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        switch (store.state) {
          case ContactsState.unknown:
          case ContactsState.loading:
            return Center(
              child: store.state == ContactsState.loading
                  ? const CircularProgressIndicator()
                  : _Message(
                      icon: Icons.contacts,
                      text: 'اعرض جهات اتصال الجوال للاتصال بها من خط المنزل',
                      action: 'السماح بالوصول',
                      onTap: () => store.load(ask: true),
                    ),
            );
          case ContactsState.denied:
            return Center(
              child: _Message(
                icon: Icons.lock_outline,
                text: 'لم يُسمح للتطبيق بقراءة جهات الاتصال.\nفعّل الإذن من إعدادات الجوال ثم عُد.',
                action: 'إعادة المحاولة',
                onTap: () => store.load(ask: true),
              ),
            );
          case ContactsState.ready:
            final q = _q.trim().toLowerCase();
            final qDigits = q.replaceAll(RegExp(r'[^0-9]'), '');
            final list = q.isEmpty
                ? store.entries
                : store.entries
                    .where((e) =>
                        e.name.toLowerCase().contains(q) ||
                        (qDigits.isNotEmpty && e.numbers.any((n) => n.replaceAll(RegExp(r'[^0-9]'), '').contains(qDigits))))
                    .toList();
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                  child: TextField(
                    controller: _search,
                    onChanged: (v) => setState(() => _q = v),
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'بحث بالاسم أو الرقم',
                      prefixIcon: const Icon(Icons.search),
                      filled: true,
                      fillColor: c.s2,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide.none),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide(color: c.primary, width: 2)),
                    ),
                  ),
                ),
                Expanded(
                  child: list.isEmpty
                      ? Center(
                          child: Text(
                            store.entries.isEmpty ? 'لا توجد جهات اتصال بأرقام' : 'لا نتائج',
                            style: TextStyle(fontSize: 16, color: c.onVariant),
                          ),
                        )
                      : ListView.builder(
                          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                          itemCount: list.length,
                          itemBuilder: (context, i) {
                            final e = list[i];
                            return ListTile(
                              onTap: () => _pick(e),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                              leading: Container(
                                width: 44,
                                height: 44,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(color: c.primaryContainer, shape: BoxShape.circle),
                                child: Text(
                                  e.name.characters.first,
                                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: c.onPrimaryContainer),
                                ),
                              ),
                              title: Text(
                                e.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: c.onSurface),
                              ),
                              subtitle: Ltr(
                                e.numbers.length == 1 ? e.numbers.first : '${e.numbers.first}  +${e.numbers.length - 1}',
                                align: TextAlign.end,
                                style: TextStyle(fontSize: 13, color: c.onVariant),
                              ),
                              trailing: Icon(Icons.call, color: c.callFg, size: 22),
                            );
                          },
                        ),
                ),
              ],
            );
        }
      },
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.text, required this.action, required this.onTap});
  final IconData icon;
  final String text;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(color: c.s2, shape: BoxShape.circle),
            child: Icon(icon, size: 42, color: c.onVariant),
          ),
          const SizedBox(height: 20),
          Text(text, textAlign: TextAlign.center, style: TextStyle(fontSize: 16, color: c.onVariant, height: 1.6)),
          const SizedBox(height: 20),
          FilledButton.tonal(onPressed: onTap, child: Text(action)),
        ],
      ),
    );
  }
}
