FROM ubuntu:24.04
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends asterisk gettext-base ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY conf/ /templates/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown -R asterisk:asterisk /etc/asterisk /var/run/asterisk /var/lib/asterisk /var/log/asterisk /var/spool/asterisk
# يعمل بمستخدم غير root من البداية، فلا يحتاج Asterisk لتغيير صلاحياته داخل الحاوية
USER asterisk
ENTRYPOINT ["/entrypoint.sh"]
