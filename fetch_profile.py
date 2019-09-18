#!/usr/bin/env python2
import json
import argparse

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import sqlalchemy

import scholarly
import config
import requests

scholarly._session = requests.session()
scholarly._session.proxies = {
            'http':  'socks5://127.0.0.1:9050',
            'https': 'socks5://127.0.0.1:9050'
        }

print(scholarly._session.get("http://httpbin.org/ip").text)


Base = declarative_base()

class Author(Base):
    __tablename__ = 'authors_search_db'
    id = Column(Integer, primary_key=True)
    name = Column(String(64))
    organization = Column(String(128))
    searched = Column(DateTime)
    filled = Column(DateTime)
    failed = Column(DateTime)
    scholar_id = Column(String(32))
    status = Column(String(32))
    json_all = Column(JSON)


engine = sqlalchemy.create_engine(config.Config.SQLALCHEMY_DATABASE_URI, echo=True)
Session = sessionmaker(bind=engine)
session = Session()


def search_and_fill(name, override=False):
    try:
        authors = scholarly.search_author(name)
        ### For each of these, save to database as
        to_fill = list(authors)
        to_fill2 = []
        for author in to_fill:
            y = vars(author)
            exst_auth = session.query(Author)\
                .filter(Author.scholar_id == y['id'])\
                .order_by(Author.id.desc())\
                .first()
            if exst_auth is None:
                print "Author was none"
                exst_auth = Author(
                name=y['name'],
                organization=y['affiliation'],
                scholar_id=y['id'],
                status="Processing",
                searched=datetime.now(),
                json_all=y)
                to_fill2.append(author)
            else:
                # Only run .fill() once!
                if (exst_auth.status != 'Processing' and\
                        exst_auth.status != 'Filled') or override == True:
                    to_fill2.append(author)
                    exst_auth.status = 'Processing'
                    exst_auth.searched = datetime.now()
                    exst_auth.filled = None
                else:
                    print "We're already searching for the DUDE!"
                    return

            session.add(exst_auth)
            print("searching")
        session.commit()

        for author in to_fill2:

            y = vars(author)
            exst_auth = session.query(Author)\
                    .filter(Author.scholar_id == y['id'])\
                    .order_by(Author.id.desc())\
                    .first()
            try:
                author.fill()
                y = vars(author)
                pubs = [vars(pubs) for pubs in y['publications']]
                y['publications'] = pubs
                exst_auth.json_all = y
                exst_auth.status = 'Filled'
                exst_auth.filled = datetime.now()
            except Exception as c:
                exst_auth.status = 'Failed'
                exst_auth.failed = datetime.now()
            session.add(exst_auth)
            session.commit()

    except Exception as a:
        print(a)


##############################

if __name__ == '__main__':

    parser = argparse.ArgumentParser(prog=__file__,
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        usage='%(prog)s [options]')
    parser.add_argument('author', nargs='*', help='name of the author to search')

    args = parser.parse_args()

    author = " ".join(args.author[1:])
    print author

    search_and_fill(author)

#############################



