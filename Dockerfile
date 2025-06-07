FROM composer/composer:2@sha256:b7ef481cbd284d30761fa6b29c0ec4e5fa56ecc7d77632f8151c513ca5214750

WORKDIR /app

# Set COMPOSER_HOME so global packages are in /root/.composer reliably.
ENV COMPOSER_HOME=/root/.composer
ENV PATH="/root/.composer/vendor/bin:$PATH"

# Remove any previous installation of psy/psysh if present.
RUN composer global remove psy/psysh || true

RUN composer global require psy/psysh

COPY composer.json composer.lock* ./

RUN composer install --no-scripts --no-interaction --no-dev

COPY . .

RUN mkdir -p /root/.config/psysh && \
    echo "<?php require '/app/vendor/autoload.php';" > /root/.config/psysh/config.php

CMD ["composer", "global", "exec", "psysh"]
