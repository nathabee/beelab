


BeeFont   — for BeeLab
====================================

 

Contents
--------
- django/BeeFontCore/*        New Django app providing /api/beefont endpoints. 
- wordpress/plugin-src/beefont/*  New WP admin plugin that calls BeeFontCore.
- docs/beefont/*              Docs and a printable worksheet placeholder.
- modification in existing files               Snippets you must merge into existing files:
    - .env
    - docker-compose.yml
    - django/Dockerfile
    - django/requirements.txt
    - django/ProjectSettings/settings.py
    - django/ProjectSettings/urls.py

 

build django and start backend service beefont
----------------

dcbuild django
dcup
dcdjango bash -lc 'mkdir -p BeeFontCore/migrations && [ -f BeeFontCore/migrations/__init__.py ] || touch BeeFontCore/migrations/__init__.py'

dcdjmm     # makemigrations + migrate (if you have this alias) 

this will do :
dcdjango python manage.py makemigrations BeeFontCore -v 3
dcdjango python manage.py showmigrations BeeFontCore
dcdjango python manage.py migrate

#####
dcdjlogs
