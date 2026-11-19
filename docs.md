# Versions
1. uv for package mgt and all - 0.9.9
2. python from uv = 3.14.9
3. DJANGO VERSION  = 6.1.3

-------------------------------------------------

# CMD;s i Used
ENV CREATION CMD - uv venv
ENV ACTIVATION CMD :- source .venv/bin/activate

django-admin --version
uv pip install django djangorestframework psycopg2-binary djangorestframework-simplejwt django-cors-headers drf-spectacular
django-admin startproject campus_expense .
python manage.py startapp core
python manage.py runserver

-------------------------------------------------
# 2 parts of out project
- PROJECT -> campus_expense
- APP -> core


-------------------------------------------------
1. added app name to setting file's INSTALLED-APPS OPTION
2. postgres start - brew services start postgresql@15
3. check if its running - brew services list
4. open terminal by - psql postgres
5. list databses - \l
6. connect to a particular db - \c campus_expense_db


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'campus_expense_db',
        'USER': 'gera',
        'PASSWORD': '',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}


we have done 
- configuring CORS
- making REST API's
- JWT based authentication
- drf_spectacular : to have swagger docs

CORS = Cross-Origin Resource Sharing.
JWT = JSON Web Token.

# db thing
python manage.py makemigrations core - Django looks at your Python models and detects changes that need to be made to the database.
python manage.py migrate - Executes the migration instructions against your actual database.

uv run python manage.py makemigrations core --empty --name add_split_sum_trigger


# SOME BASIC SQL CMD'S FOR THE DBEAVER USING(SHOW TABLES DOES N;T WORK IN POSTGRES SQL)

select current_database();

SELECT tablename
FROM pg_catalog.pg_tables
WHERE schemaname = 'public';

select * from "groups" g ;

made the custom trigger for split equal to total amt :- python manage.py makemigrations core --empty --name add_split_sum_trigger

we need to give both forward and reverse sql cmd in order to put the migration of trigger


similarly i also created a view migration


------------------------------------------------


serilizers - convert the JSON to the models we have and validate it and convert the models to json so frontend can undesrtand
- since REST deals with JSON
- link frontend <-> Backend (frontend talks in json, backend talks in db models)


viewsets - 
viewsets.ModelViewSet - automatically provides CRUD operations


router = DefaultRouter() - no need to create individual CRUD routes for each model


------------------------------------------------


What lib/api.ts is and why it’s the whole trick

Right now your backend is the only thing that knows its own shape — routes, field names, what a response looks like. If you hand an AI a screenshot and say “build this,” it has to guess all of that, and it will guess wrong in small ways (/api/group/ vs /api/groups/, amount vs total_amount, forgetting the JWT header). Those small mismatches are what cause the classic “frontend looks right, nothing actually saves” failure.

api.ts fixes this by being a single typed file that is the contract: one function per backend endpoint, with the URL, method, and field names hardcoded exactly as your Django code defines them. Once it exists, the AI never talks to your API directly — it only ever calls functions you already wrote and already tested. It literally cannot invent a wrong endpoint because it isn’t choosing endpoints at all, it’s choosing which of your functions to call for a given button.

------------------------------------------------

python manage.py createsuperuser

