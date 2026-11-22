import 'package:material_ui/material_ui.dart';

/// ألوان التصميم. الأسماء تطابق ورقة الأنماط المعتمدة (فاتح وداكن).
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.primary,
    required this.onPrimary,
    required this.primaryContainer,
    required this.onPrimaryContainer,
    required this.surface,
    required this.s1,
    required this.s2,
    required this.s3,
    required this.onSurface,
    required this.onVariant,
    required this.outline,
    required this.outlineVariant,
    required this.call,
    required this.callFg,
    required this.callContainer,
    required this.hang,
    required this.hangFg,
    required this.hangContainer,
    required this.warn,
    required this.warnFg,
    required this.warnContainer,
  });

  final Color primary, onPrimary, primaryContainer, onPrimaryContainer;
  final Color surface, s1, s2, s3, onSurface, onVariant, outline, outlineVariant;
  final Color call, callFg, callContainer;
  final Color hang, hangFg, hangContainer;
  final Color warn, warnFg, warnContainer;

  static const light = AppColors(
    primary: Color(0xFF0B5D57),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFC4ECE5),
    onPrimaryContainer: Color(0xFF00201D),
    surface: Color(0xFFF5FAF8),
    s1: Color(0xFFEEF4F2),
    s2: Color(0xFFE7EEEC),
    s3: Color(0xFFDCE5E2),
    onSurface: Color(0xFF161D1B),
    onVariant: Color(0xFF3F4946),
    outline: Color(0xFF6F7976),
    outlineVariant: Color(0xFFBEC9C5),
    call: Color(0xFF1E8E3E),
    callFg: Color(0xFF17753A),
    callContainer: Color(0xFFCDEFD5),
    hang: Color(0xFFC62828),
    hangFg: Color(0xFFB3261E),
    hangContainer: Color(0xFFFFDAD6),
    warn: Color(0xFFEF8A00),
    warnFg: Color(0xFF9A4F00),
    warnContainer: Color(0xFFFFE2C2),
  );

  static const dark = AppColors(
    primary: Color(0xFF86D5CA),
    onPrimary: Color(0xFF003732),
    primaryContainer: Color(0xFF0B5D57),
    onPrimaryContainer: Color(0xFFA6F1E6),
    surface: Color(0xFF0E1513),
    s1: Color(0xFF161D1B),
    s2: Color(0xFF1C2321),
    s3: Color(0xFF272E2C),
    onSurface: Color(0xFFDDE4E1),
    onVariant: Color(0xFFBEC9C5),
    outline: Color(0xFF899390),
    outlineVariant: Color(0xFF3F4946),
    call: Color(0xFF22A04A),
    callFg: Color(0xFF80DA96),
    callContainer: Color(0xFF0F4A23),
    hang: Color(0xFFDC3B36),
    hangFg: Color(0xFFFFB4AB),
    hangContainer: Color(0xFF690005),
    warn: Color(0xFFFF9F2E),
    warnFg: Color(0xFFFFB870),
    warnContainer: Color(0xFF5A3100),
  );

  @override
  AppColors copyWith() => this;

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) => t < 0.5 || other is! AppColors ? this : other;
}

extension AppColorsX on BuildContext {
  AppColors get c => Theme.of(this).extension<AppColors>()!;
}

const appFont = 'IBMPlexSansArabic';

/// نمط الأرقام: عرض ثابت للخانات حتى لا يهتزّ العدّاد والرقم أثناء الكتابة.
const tabular = [FontFeature.tabularFigures()];

ThemeData buildTheme(Brightness brightness) {
  final c = brightness == Brightness.dark ? AppColors.dark : AppColors.light;
  final scheme = ColorScheme(
    brightness: brightness,
    primary: c.primary,
    onPrimary: c.onPrimary,
    primaryContainer: c.primaryContainer,
    onPrimaryContainer: c.onPrimaryContainer,
    secondary: c.primary,
    onSecondary: c.onPrimary,
    secondaryContainer: c.primaryContainer,
    onSecondaryContainer: c.onPrimaryContainer,
    error: c.hangFg,
    onError: c.onPrimary,
    errorContainer: c.hangContainer,
    onErrorContainer: c.hangFg,
    surface: c.surface,
    onSurface: c.onSurface,
    onSurfaceVariant: c.onVariant,
    outline: c.outline,
    outlineVariant: c.outlineVariant,
    surfaceContainerLowest: c.surface,
    surfaceContainerLow: c.s1,
    surfaceContainer: c.s1,
    surfaceContainerHigh: c.s2,
    surfaceContainerHighest: c.s3,
  );
  final border = OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide(color: c.outline));
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    fontFamily: appFont,
    scaffoldBackgroundColor: c.surface,
    extensions: [c],
    splashFactory: InkSparkle.splashFactory,
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: c.s2,
      indicatorColor: c.primaryContainer,
      surfaceTintColor: Colors.transparent,
      height: 68,
      iconTheme: WidgetStateProperty.resolveWith(
        (s) => IconThemeData(size: 22, color: s.contains(WidgetState.selected) ? c.onPrimaryContainer : c.onVariant),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => TextStyle(
          fontFamily: appFont,
          fontSize: 12,
          fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
          color: s.contains(WidgetState.selected) ? c.onSurface : c.onVariant,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: border,
      enabledBorder: border,
      focusedBorder: border.copyWith(borderSide: BorderSide(color: c.primary, width: 2)),
      labelStyle: TextStyle(color: c.onVariant, fontSize: 14),
      floatingLabelStyle: TextStyle(color: c.onVariant, fontSize: 14),
      helperStyle: TextStyle(color: c.onVariant, fontSize: 12),
      hintStyle: TextStyle(color: c.outline),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: c.primary,
        foregroundColor: c.onPrimary,
        minimumSize: const Size.fromHeight(56),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontFamily: appFont, fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
