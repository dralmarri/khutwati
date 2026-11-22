#!/usr/bin/env bash
# deploy — أداة نشر عامة لأي مشروع على الخادم.
#
# تُنصَّب مرة واحدة على الخادم، ثم تُستدعى من الطرفية أو من اختصار في الجوال عبر SSH:
#
#   deploy <المشروع> [العملية] [الفرع] [-- معطيات للسكربت]
#
# تجلب آخر نسخة من مستودع المشروع، ثم تشغّل منه السكربت  tools/DEPLOY_<العملية>.sh
# فكل مشروع يعرّف عملياته بنفسه بإضافة ملفات بهذا الاسم.
#
#   deploy                      قائمة المشاريع المنصوبة
#   deploy khutwati list        عمليات المشروع المتاحة
#   deploy khutwati             العملية الافتراضية (deploy) على آخر فرع استُخدم
#   deploy khutwati homephone-status
#   deploy khutwati homephone claude/some-branch
#   deploy someone/other-repo   مستودع لمالك آخر
#   deploy khutwati --force     يتجاوز التعديلات اليدوية على الخادم (انظر الأسفل)
#
# الإعداد (اختياري) في /etc/deploy.conf أو ~/.deploy.conf :
#   DEPLOY_OWNER=dralmarri              مالك المستودعات الافتراضي على GitHub
#   DEPLOY_GIT_BASE=git@github.com:     للمستودعات الخاصة عبر مفتاح SSH (الافتراضي https://github.com/)
#   DEPLOY_HOME=/srv/apps               أين تُحفظ المشاريع (الافتراضي /opt، أو ~/apps لغير root)
#   DEPLOY_TAIL=40                      عدد أسطر الناتج المعروضة (تناسب شاشة الجوال)
set -euo pipefail

for conf in /etc/deploy.conf "$HOME/.deploy.conf"; do
  # shellcheck disable=SC1090
  [ -f "$conf" ] && . "$conf"
done
: "${DEPLOY_OWNER:=}"
: "${DEPLOY_GIT_BASE:=https://github.com/}"
if [ -z "${DEPLOY_HOME:-}" ]; then
  if [ -w /opt ]; then DEPLOY_HOME=/opt; else DEPLOY_HOME="$HOME/apps"; fi
fi
: "${DEPLOY_TAIL:=40}"

die() { echo "❌ $*" >&2; exit 1; }

state="$DEPLOY_HOME/.deploy"
mkdir -p "$state/logs" "$state/locks"

# ---------- بدون معطيات: قائمة المشاريع ----------
if [ $# -eq 0 ]; then
  echo "المشاريع في $DEPLOY_HOME :"
  found=0
  for d in "$DEPLOY_HOME"/*/.git; do
    [ -d "$d" ] || continue
    found=1
    p="$(dirname "$d")"
    echo "  $(basename "$p")  ($(git -C "$p" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?'))"
  done
  [ "$found" = 1 ] || echo "  (لا يوجد بعد)"
  echo
  echo "الاستخدام: deploy <المشروع> [العملية] [الفرع]"
  exit 0
fi

# ---------- قراءة المعطيات ----------
project="$1"; shift
action=""; branch=""; extra=(); force=0
while [ $# -gt 0 ]; do
  if [ "$1" = "--" ]; then shift; extra=("$@"); break; fi
  if [ "$1" = "--force" ]; then force=1
  elif [ -z "$action" ]; then action="$1"
  elif [ -z "$branch" ]; then branch="$1"
  else die "معطيات زائدة: $1"
  fi
  shift
done
: "${action:=deploy}"

case "$project" in
  */*) owner="${project%%/*}"; repo="${project#*/}" ;;
  *)   owner="$DEPLOY_OWNER";  repo="$project" ;;
esac
valid='^[A-Za-z0-9][A-Za-z0-9._-]*$'
[[ "$repo" =~ $valid ]] || die "اسم مشروع غير صالح: $repo"
[[ "$action" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]] || die "اسم عملية غير صالح: $action"
[ -z "$branch" ] || [[ "$branch" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] || die "اسم فرع غير صالح: $branch"

dir="$DEPLOY_HOME/$repo"

# ---------- قفل: عملية واحدة لكل مشروع في الوقت نفسه ----------
if command -v flock >/dev/null 2>&1; then
  exec 9>"$state/locks/$repo.lock"
  flock -n 9 || die "توجد عملية أخرى جارية على $repo. انتظر انتهاءها."
fi

# ---------- جلب الكود ----------
if [ ! -d "$dir/.git" ]; then
  [ -n "$owner" ] || die "المشروع $repo غير منصوب. اكتب المالك معه (مثل owner/$repo) أو عرّف DEPLOY_OWNER."
  [[ "$owner" =~ $valid ]] || die "اسم مالك غير صالح: $owner"
  echo "تنزيل $owner/$repo لأول مرة…"
  git clone -q "${DEPLOY_GIT_BASE}${owner}/${repo}.git" "$dir" \
    || die "تعذّر تنزيل المستودع. إن كان خاصاً فجهّز مفتاح SSH أو رمز دخول على الخادم."
fi
cd "$dir"
git fetch -q --prune origin || die "تعذّر الاتصال بالمستودع (git fetch)."

if [ -z "$branch" ]; then
  branch="$(git config --get deploy.branch || true)"
fi
if [ -z "$branch" ]; then
  # مشروع موجود مسبقاً على الخادم: نبقى على فرعه الحالي
  current="$(git symbolic-ref -q --short HEAD || true)"
  if [ -n "$current" ] && git rev-parse -q --verify "refs/remotes/origin/$current" >/dev/null; then branch="$current"; fi
fi
if [ -z "$branch" ]; then
  branch="$(git symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)"
  : "${branch:=main}"
fi
if ! git rev-parse -q --verify "refs/remotes/origin/$branch" >/dev/null; then
  echo "❌ الفرع '$branch' غير موجود في $repo. الفروع المتاحة:" >&2
  git for-each-ref --format='  %(refname:lstrip=3)' refs/remotes/origin | grep -v '^  HEAD$' >&2
  exit 1
fi
# الخادم يطابق المستودع. الملفات غير المتتبَّعة (مثل .env والمفاتيح) لا تُمسّ أبداً،
# أما تعديل يدوي على ملف متتبَّع فنتوقف عنده حتى لا يضيع، إلا مع --force.
dirty="$(git status --porcelain --untracked-files=no)"
if [ -n "$dirty" ] && [ "$force" != 1 ]; then
  echo "❌ في $dir ملفات عُدّلت يدوياً على الخادم وسيمحوها التحديث:" >&2
  echo "$dirty" | head -n 15 >&2
  echo "احفظها في المستودع أولاً، أو أعد الأمر مع --force لتجاهلها." >&2
  exit 1
fi
git checkout -q -f -B "$branch" "origin/$branch"
git config deploy.branch "$branch"
commit="$(git rev-parse --short HEAD)"

list_actions() {
  local any=0 f
  for f in tools/DEPLOY_*.sh; do
    [ -f "$f" ] || continue
    any=1
    f="${f#tools/DEPLOY_}"; f="${f%.sh}"
    # السطر الثاني من السكربت وصف قصير له إن بدأ بـ "# "
    echo "  $f$(sed -n '2s/^# */ — /p' "tools/DEPLOY_$f.sh")"
  done
  [ "$any" = 1 ] || echo "  (لا توجد ملفات tools/DEPLOY_*.sh في هذا الفرع)"
}

if [ "$action" = "list" ]; then
  echo "$repo @ $branch ($commit) — العمليات المتاحة:"
  list_actions
  exit 0
fi

script="tools/DEPLOY_$action.sh"
if [ ! -f "$script" ]; then
  echo "❌ لا توجد عملية '$action' في $repo @ $branch. المتاح:" >&2
  list_actions >&2
  exit 1
fi

# ---------- التشغيل ----------
log="$state/logs/$repo.log"
out="$(mktemp)"
trap 'rm -f "$out"' EXIT
export DEPLOY_REPO="$repo" DEPLOY_BRANCH="$branch" DEPLOY_COMMIT="$commit" DEPLOY_DIR="$dir"

code=0
bash "$script" ${extra[@]+"${extra[@]}"} >"$out" 2>&1 9>&- || code=$?

{
  echo "===== $(date '+%F %T') $repo@$branch ($commit) $action -> $code ====="
  cat "$out"
} >> "$log"

if [ "$code" -eq 0 ]; then
  echo "✅ $repo · $action · $branch ($commit)"
else
  echo "❌ $repo · $action · $branch ($commit) — فشل برمز $code"
fi
total="$(wc -l < "$out")"
[ "$total" -le "$DEPLOY_TAIL" ] || echo "… (آخر $DEPLOY_TAIL سطراً من $total، والباقي في $log)"
tail -n "$DEPLOY_TAIL" "$out"
exit "$code"
