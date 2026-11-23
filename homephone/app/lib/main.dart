import 'package:material_ui/material_ui.dart';

import 'phone_service.dart';
import 'screens/call_screen.dart';
import 'screens/contacts_screen.dart';
import 'screens/dialpad_screen.dart';
import 'screens/history_screen.dart';
import 'screens/settings_screen.dart';
import 'theme.dart';
import 'widgets.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PhoneService.instance.init();
  runApp(const HomePhoneApp());
}

class HomePhoneApp extends StatelessWidget {
  const HomePhoneApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'هاتف المنزل',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      builder: (context, child) => Directionality(textDirection: TextDirection.rtl, child: child!),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  final phone = PhoneService.instance;
  static const _settingsTab = 3;
  late int _tab = phone.settings.isConfigured ? 0 : _settingsTab;
  final _dialpadKey = GlobalKey<DialpadScreenState>();
  final _contactsKey = GlobalKey<ContactsScreenState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) phone.onAppResumed();
  }

  void _redial(String number) {
    setState(() => _tab = 0);
    _dialpadKey.currentState?.setNumber(number);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: phone,
      builder: (context, _) {
        if (phone.phase != CallPhase.idle) return const CallScreen();
        return Scaffold(
          body: SafeArea(
            bottom: false,
            child: Column(
              children: [
                AppHeader(phone: phone),
                Expanded(
                  child: IndexedStack(
                    index: _tab,
                    children: [
                      DialpadScreen(key: _dialpadKey),
                      ContactsScreen(key: _contactsKey, onPick: _redial),
                      HistoryScreen(onRedial: _redial),
                      const SettingsScreen(),
                    ],
                  ),
                ),
              ],
            ),
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tab,
            onDestinationSelected: (i) {
              setState(() => _tab = i);
              if (i == 1) _contactsKey.currentState?.opened();
              if (i == 2) phone.markHistorySeen();
            },
            destinations: [
              const NavigationDestination(icon: Icon(Icons.dialpad), label: 'الاتصال'),
              const NavigationDestination(icon: Icon(Icons.contacts), label: 'الأسماء'),
              NavigationDestination(
                // شارة بعدد المكالمات الفائتة التي لم تُفتح صفحة السجل بعدها
                icon: Badge(
                  isLabelVisible: phone.unseenMissed > 0 && _tab != 2,
                  label: Text('${phone.unseenMissed}'),
                  backgroundColor: context.c.hang,
                  child: const Icon(Icons.history),
                ),
                label: 'السجل',
              ),
              const NavigationDestination(icon: Icon(Icons.settings), label: 'الإعدادات'),
            ],
          ),
        );
      },
    );
  }
}
