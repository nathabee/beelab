# ./wordpress/Dockerfile
FROM wordpress:6-php8.3-apache
RUN echo "ServerName localhost" > /etc/apache2/conf-available/servername.conf \
    && a2enconf servername
