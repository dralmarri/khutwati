FROM ubuntu:24.04
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends asterisk gettext-base ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY conf/ /templates/
COPY entrypoint.sh /entrypoint.sh
# مجلد التشغيل /var/run/asterisk لا يوجد في صورة Docker (ينشئه systemd عادةً) وبدونه لا يقلع Asterisk
RUN chmod +x /entrypoint.sh \
 && for d in /etc/asterisk /var/run/asterisk /var/lib/asterisk /var/log/asterisk /var/spool/asterisk; do \
      mkdir -p "$d" && chown -R asterisk:asterisk "$d"; \
    done
# يعمل بمستخدم غير root من البداية، فلا يحتاج Asterisk لتغيير صلاحياته داخل الحاوية
USER asterisk
ENTRYPOINT ["/entrypoint.sh"]
