This is the **web application** that someone can use in order to **manage** 
universities, authors, and benchmarks, and to also **benchmark** authors against
their peers.

## PREPARE THE ENVIRONMENT

    curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
    sudo apt-get install build-essential python2.7 python-dev libmysqlclient-dev mysql-client python-numpy python-matplotlib nodejs python-pandas
    sudo npm install -g bower

## CLONE THE CODE

    cd citation-analysis-web
    git submodule init
    git submodule update

## INSTALL THE DEPENDENCIES

Install the **back-end dependencies**.

    pip install -r requirements.txt

Install the **front-end dependencies**.

    cd app/static
    bower install
    
## CONFIGURE THE APPLICATION

Create `config.py` based on `config.py.sample`.

    cp config.py.sample config.py
    
Edit `config.py`.

## RUN THE APPLICATION

    python run.py

## ACCESS THE APPLICATION

Access the **administration panel** @ http://localhost:5000/admin/index.html.
    
Access the **dashboard** @ http://localhost:5000/index.html.
