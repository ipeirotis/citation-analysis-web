This is the **web application** that someone can use in order to **manage**
universities, authors, and benchmarks, and to also **benchmark** authors against
their peers.

## REQUIREMENTS

- Python 3.5.3
- Node.js 6.17.1

Packages you may need:
    ```
    sudo apt-get install build-essential libmysqlclient-dev mysql-client python3 python3-dev virtualenv nodeenv
    ```

## CLONE THE CODE

```
cd citation-analysis-web
git submodule init
git submodule update
```

## INSTALL THE DEPENDENCIES

Install the **back-end dependencies**.

```
virtualenv -p python3 venv
. venv/bin/activate
pip install -r requirements.txt
```

Install the **front-end dependencies**.

```
nodeenv --prebuilt -n 6.17.1 env
. env/bin/activate
npm install -g bower
cd app/static
bower install
```

## CONFIGURE THE APPLICATION

Create `config.py` based on `config.py.sample`.

```
cp config.py.sample config.py
```

Edit `config.py`.

```
vi config.py
```

## RUN THE APPLICATION

```
FLASK_ENV=development flask run
``

## ACCESS THE APPLICATION

Access the **administration panel** @ http://localhost:5000/admin/index.html.

Access the **dashboard** @ http://localhost:5000/index.html.
