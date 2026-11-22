import 'package:material_ui/material_ui.dart';

import 'phone_service.dart';
import 'screens/call_screen.dart';
import 'screens/dialpad_screen.dart';
import 'screens/history_screen.dart';
import 'screens/settings_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PhoneService.instance.init();
  runApp(const HomePhoneApp());
}

class HomePhoneApp extends StatelessWidget {
  const HomePhoneApp({super.key});

  @override
  Widget build(BuildContext context) {
    ThemeData theme(Brightness b) => ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0B5D57), brightness: b),
          useMaterial3: true,
        );
    return MaterialApp(
      title: 'هاتف المنزل',
      debugShowCheckedModeBanner: false,
      theme: theme(Brightness.light),
      darkTheme: theme(Brightness.dark),
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
  late int _tab = phone.settings.isConfigured ? 0 : 2;
  final _dialpadKey = GlobalKey<DialpadScreenState>();

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
          appBar: AppBar(
            title: const Text('هاتف المنزل'),
            actions: [Padding(padding: const EdgeInsetsDirectional.only(end: 12), child: _StatusChip(phone: phone))],
          ),
          body: IndexedStack(
            index: _tab,
            children: [
              DialpadScreen(key: _dialpadKey),
              HistoryScreen(onRedial: _redial),
              const SettingsScreen(),
            ],
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tab,
            onDestinationSelected: (i) => setState(() => _tab = i),
            destinations: const [
              NavigationDestination(icon: Icon(Icons.dialpad), label: 'الاتصال'),
              NavigationDestination(icon: Icon(Icons.history), label: 'السجل'),
              NavigationDestination(icon: Icon(Icons.settings), label: 'الإعدادات'),
            ],
          ),
        );
      },
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.phone});
  final PhoneService phone;

  @override
  Widget build(BuildContext context) {
    final ok = phone.isRegistered;
    final color = ok ? Colors.green : Theme.of(context).colorScheme.error;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.circle, size: 10, color: color),
        const SizedBox(width: 6),
        Text(ok ? 'تحويلة ${phone.settings.extension}' : (phone.settings.isConfigured ? 'غير متصل' : 'غير مُعدّ')),
      ],
    );
  }
}
