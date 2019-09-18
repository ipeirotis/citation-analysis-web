from app import app, db
from datetime import datetime
from flask import Flask, jsonify, make_response, request, Response, send_file
from flask.ext.restless import APIManager, ProcessingException
import math
import matplotlib
matplotlib.use("Agg", force=True)
matplotlib.rc("figure", facecolor="white")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg
from models import Author, Benchmark, Organization, Publication, Suggestions
import pandas
import numpy
import requests
from sqlalchemy import text
import StringIO
from threading import RLock
from urlparse import urljoin

import scholarly
import seaborn as sns
import cStringIO
import base64
import subprocess

from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy_fulltext import FullText, FullTextSearch
import sqlalchemy_fulltext.modes as FullTextMode


Base = declarative_base()

class TempAuthor(FullText, Base):
    __tablename__ = 'authors_search_db'
    __fulltext_columns__ = ('name',)

    id = Column(Integer, primary_key=True)
    name = Column(String(64))
    organization = Column(String(128))
    searched = Column(DateTime)
    filled = Column(DateTime)
    failed = Column(DateTime)
    scholar_id = Column(String(32))
    status = Column(String(32))
    json_all = Column(JSON)


engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'], echo=True)
Session = sessionmaker(bind=engine)
session = Session()


def renew_session():
    scholarly._SESSION = requests.Session()
    scholarly._SESSION.proxies = {
        'http':  'socks5://127.0.0.1:9050',
        'https': 'socks5://127.0.0.1:9050'
    }
    print(scholarly._SESSION.get("http://httpbin.org/ip").text)

apimanager = APIManager(app, flask_sqlalchemy_db=db)

lock = RLock()

ERRORIMAGE = "static/error_image.png"

# Set up the organizations API.

apimanager.create_api(Organization, methods=['DELETE', 'GET', 'POST', 'PUT'],
                      include_methods=['ancestor_ids'],
                      exclude_columns=['authors'],
                      results_per_page=None)



@app.route('/api/organization/root', methods=['GET'])
def get_root_organizations():
    """
    Gets all root organizations.
    """

    page = int(request.args.get('page'))
    per_page = int(request.args.get('per_page'))

    query = Organization.query.filter_by(parent_id=None) \
                        .order_by('id').paginate(page, per_page, False)
    total = query.total
    organizations = query.items
    roots = []
    for organization in organizations:
        roots.append({'id': organization.id,
                      'name': organization.name,
                      'location': organization.location,
                      'website_url': organization.website_url})
    result = {'roots': roots,
              'total': total,
              'total_pages': int(math.ceil(total / float(per_page)))}
    return jsonify(**result)


@app.route('/api/organization/<id>/tree', methods=['GET'])
def get_organization_tree(id):
    """
    Gets the hierarchical tree that has an organization as the root.
    """

    organization = Organization.query.filter_by(id=id).first()
    result = {'tree': organization.descendant_tree()}
    return jsonify(**result)


@app.route('/api/organization/<id>/authors', methods=['GET'])
def get_affiliated_authors(id):
    """
    Gets a list of authors that are affiliated with this organization
    """

    page = int(request.args.get('page'))
    per_page = int(request.args.get('per_page'))

    query = Author.query.filter_by(organization_id=id) \
                        .order_by('id').paginate(page, per_page, False)
    total = query.total
    authors = query.items
    results = []
    for author in authors:
        results.append({'id': author.id,
                      'name': author.name,
                      'organization': {
                          'id': author.organization.id
                       },
                      'auto_org_assignment': author.auto_org_assignment})

    result = {'authors': results,
              'total': total,
              'total_pages': int(math.ceil(total / float(per_page)))}
    return jsonify(**result)


# Set up the authors API.

def preprocess_author(search_params=None, **kw):
    if search_params is None:
        return
    if 'filters' not in search_params:
        return
    filters = search_params['filters']
    if len(filters) != 1:
        return
    filter = filters[0]
    if 'name' not in filter:
        return
    if filter['name'] != 'scholar_id':
        return
    if filter['op'] != '==':
        return
    scholar_id = filter['val']
    author = Author.query.filter_by(scholar_id=scholar_id).first()
    if (author is None or author.retrieved_at is None):
        r = requests.get(urljoin(app.config['SUPERVISOR_BASE_URL'],
                                 '/crawl-request/author/' + scholar_id))
        raise ProcessingException(description='Try later.', code=202)
    elif (datetime.now() - author.retrieved_at).days > 60:
        r = requests.get(urljoin(app.config['SUPERVISOR_BASE_URL'],
                                 '/crawl-request/author/' + scholar_id))
        pass

apimanager.create_api(Author, methods=['DELETE', 'GET', 'POST', 'PUT'],
                      include_methods=['organization_ids', 'organization_tree'],
                      exclude_columns=[],
                      preprocessors={'GET_MANY': [preprocess_author]},
                      results_per_page=None)


@app.route('/api/author/search', methods=['GET'])
def search_authors():
    """
    Gets the authors whose name match a string and who have a Google Scholar ID.
    """

    s = request.args.get('s', None)

    authors = Author.query.filter(Author.scholar_id != None,
                                  Author.name.ilike('%' + s + '%')) \
                          .all()
    result = {
        'authors': map(
            lambda author: {
                'id': author.id,
                'name': author.name + ' (' + author.scholar_id + ')',
                'organization': author.organization_tree()},
            authors)}

    return jsonify(**result)

# Set up the publications API.


def preprocess_publication(search_params=None, **kw):
    if search_params is None:
        return
    if 'filters' not in search_params:
        return
    filters = search_params['filters']
    if len(filters) != 1:
        return
    filter = filters[0]
    if 'name' not in filter:
        return
    if filter['name'] != 'scholar_id':
        return
    if filter['op'] != '==':
        return
    scholar_id = filter['val']
    publication = Publication.query.filter_by(scholar_id=scholar_id) \
                             .first()
    if (publication is None or publication.retrieved_at is None):
        r = requests.get(urljoin(app.config['SUPERVISOR_BASE_URL'],
                                 '/crawl-request/publication/' + scholar_id))
        raise ProcessingException(description='Try later.', code=202)
    elif (datetime.now() - publication.retrieved_at).days > 365:
        r = requests.get(urljoin(app.config['SUPERVISOR_BASE_URL'],
                                 '/crawl-request/publication/' + scholar_id))
        pass

apimanager.create_api(Publication, methods=['GET'],
                      include_methods=[],
                      exclude_columns=[],
                      preprocessors={'GET_MANY': [preprocess_publication]},
                      results_per_page=None)

# Set up the Benchmarks and the Suggestions API.

apimanager.create_api(Benchmark, methods=['DELETE', 'GET', 'POST', 'PUT'],
                      include_methods=[],
                      exclude_columns=[],
                      results_per_page=None)


apimanager.create_api(Suggestions, methods=['DELETE', 'GET', 'POST', 'PUT'],
                      include_methods=[],
                      exclude_columns=[],
                      results_per_page=None)



@app.route('/api/benchmark/query/test', methods=['POST'])
def test_benchmark_query():
    """
    Checks whether a query is a valid benchmark query, and returns some results
    for the user to validate.
    """

    json = request.get_json()
    query = json.get('query')
    result = {}
    if query is None:
        result['is_valid'] = False
    elif not query.lower().startswith('select'):
        result['is_valid'] = False
    else:
        sql = text(query + ' LIMIT 10')
        try:
            rows = db.engine.execute(sql)
            result['is_valid'] = True
            ids = []
            for row in rows:
                ids.append(str(row['id']))
            result['rows'] = []
            if ids:
                sql = text('SELECT id, name FROM author WHERE id IN (' + ','.join(ids) + ')')
                rows = db.engine.execute(sql)
                for row in rows:
                    r = {'id': row['id'],
                         'name': row['name']}
                    result['rows'].append(r)
        except:
            result['is_valid'] = False
    return jsonify(**result)


@app.route('/api/benchmark/<id>/authors', methods=['GET'])
def count_benchmark_authors(id):
    """
    Counts the authors that a benchmark describes.
    """

    benchmark = Benchmark.query.filter_by(id=id).first()

    count = db.engine.execute(text('SELECT COUNT(*) ' +
                                   'FROM author ' +
                                   'WHERE id IN (' + benchmark.the_query + ') ' +
                                   'AND scholar_id IS NOT NULL ' +
                                   'AND organization_id IS NOT NULL ' +
                                   'AND retrieved_at IS NOT NULL ' +
                                   'AND EXISTS (SELECT 1 FROM author_citations_per_year WHERE author_id = id)')) \
                     .first()[0]

    result = {'count': count}
    return jsonify(**result)

@app.route('/api/benchmarks/countall', methods=['GET'])
def count_benchmark_authors2():
    """
    Counts the authors that a benchmark describes.
    """

    benchmarks = Benchmark.query.all()
    txt = "(SELECT '{}' as name, A.id FROM ({}) AS A)"
    qs = " UNION ALL ".join([txt.format(b.name, b.the_query) for b in benchmarks])
    print qs
    query = """
        select
            name, count(*) as cnt
        from
            ({})
        as A JOIN (
            select
                author.id
            from
                author
            JOIN (
                    select distinct author_id from author_citations_per_year
                ) A
            ON
                A.author_id = author.id
            where
                author.scholar_id is not null
            and
                author.organization_id is not null
            and
                author.retrieved_at is not null
        ) as B
        on 
            A.id = B.id
        group by
            name;
    """.format(qs)

    counts = db.engine.execute(text(query)).fetchall()

    result = {'counts': [{"name": c[0], "count": c[1]} for c in counts]}
    return jsonify(**result)



@app.route('/api/benchmark/<id>/list-authors', methods=['GET'])
def get_author_list(id):
    """
    Gets a list of authors that are included in a benchmar
    """

    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 15))

    benchmark = Benchmark.query.filter_by(id=id).first()

    query = '''
        select
            author.name,
            scholar_id,
            organization.name as org_name
        from
            author,
            organization
        where
            author.scholar_id is not null
        and
            author.id in ({benchmark})
        and
            author.organization_id = organization.id
    '''.format(benchmark=benchmark.the_query)

    total = db.engine.execute("select count(*) as A from ({}) as B".format(query)).fetchone()[0]
    query += " LIMIT {} OFFSET {}".format(per_page, (page-1)*per_page)
    cursor = db.engine.execute(query)

    items = cursor.fetchmany(per_page)

    items = [{'name': it[0], 'scholar_id': it[1], 'organization': it[2]}
                for it in items]

    result = {'authors': items,
              'total': total,
              'total_pages': int(math.ceil(total / float(per_page)))}
    return jsonify(**result)


@app.route('/dashboard/benchmark-quantiles', methods=['GET'])
def plot_benchmark_quantiles():
    """
    Plots the quantiles for a benchmark.
    """
    # utils
    cnt_nz = lambda x: numpy.count_nonzero(~numpy.isnan(x))

    percentiles = [25, 50, 75, 90, 95]
    percentiles_nan = lambda x: pandas.Series(numpy.nanpercentile(x, q=percentiles).flatten(), index=percentiles)

    # The ID of the benchmark.
    benchmark = request.args.get('benchmark', None)

    # The flag to make y axis logarithmic.
    logy_flag = request.args.get('logy', 'false') == 'true'

    # Either Yearly or Cumulative
    what = request.args.get('what', 'yearly')

    # The query of the benchmark.
    benchmark_name, benchmark_query = db.engine.execute(
        text('SELECT name, query FROM benchmark WHERE id = :id'),
        id=benchmark).fetchone()

    # The citations per year for all the authors that are described by
    # the benchmark.
    query = '''
SELECT
    CONCAT(a.name, ' (', a.scholar_id , ')') AS Name,
    c.year - m.start + 1 AS Age,
    c.citations AS Citations
FROM author a
    INNER JOIN
        author_citations_per_year c
        ON a.id = c.author_id
    INNER JOIN
        (
        SELECT
            author_id,
            MIN(year) AS start
        FROM author_citations_per_year
        GROUP BY author_id
        ) m
    ON m.author_id = a.id
WHERE   c.author_id IN ({benchmark})
    AND a.organization_id IS NOT NULL
    AND a.retrieved_at IS NOT NULL
    ORDER BY a.scholar_id, c.year
    '''.format(benchmark=benchmark_query)
    data = db.engine.execute(text(query)).fetchall()
    # Plot.
    cols = ['Name', 'Age', 'Citations']
    data_frame = pandas.DataFrame.from_records(data, columns=cols)
    by_year = data_frame.pivot(index='Age', columns='Name',
                              values='Citations')
    totals = data_frame.pivot(index='Age', columns='Name',
                              values='Citations').cumsum()
    plt.clf()
    try:
        if what == 'agebar':
            profs_per_year = by_year.apply(cnt_nz, axis=1)
            axes = profs_per_year.plot.bar(grid=True, alpha=0.4, figsize=(16, 8))
            axes.set_yscale('log', basey=2)
            title = ("Number of Professors in Benchmark '{}' as a Function of Age"
                     " (Inverse Cumulative)").format(benchmark_name)
            ylabel = "Number of Professors"
            xlabel = "Age (Years since first citation)"
        elif what == 'yearly':
            perc = by_year.apply(percentiles_nan, axis=1)
            axes = perc.plot(logy=logy_flag, alpha=0.8,
                             grid=True, figsize=(16, 8))
            title = ("Yearly Number of Citations for Different Percentiles."
                     " Benchmark: {}").format(benchmark_name)
            ylabel = "Number of citations"
            xlabel = "Age (Years since first citation)"
        else:
            perc = totals.apply(percentiles_nan, axis=1)
            axes = perc.plot(logy=logy_flag, alpha=0.8,
                             grid=True, figsize=(16,8))
            title = ("Cumulative Number of Citations for Different Percentiles."
                    " Benchmark: {}").format(benchmark_name)
            ylabel = "Number of citations"
            xlabel = "Age (Years since first citation)"
    except Exception as exc:  # This happens when there are no data in benchmark
        print type(exc)
        print exc
        axes = plt.figure().add_subplot(111)
        title = ("An Error of type {} occured.\n"
                 "Python says: {}.").format(type(exc).__name__, exc)
        ylabel = ""
        xlabel = ""

    axes.set_title(title)
    axes.set_ylabel(ylabel, fontsize='x-large')
    axes.set_xlabel(xlabel, fontsize='x-large')
    if what != 'agebar':
        axes.legend(fancybox=True, frameon=True, loc="upper left", ncol=1)

    # Send the plot.
    figure = axes.get_figure()
    canvas = FigureCanvasAgg(figure)
    output = StringIO.StringIO()
    canvas.print_png(output)
    response = make_response(output.getvalue())
    response.mimetype = 'image/png'
    return response


@app.route('/dashboard/benchmark-quantiles-and-author', methods=['GET'])
def plot_benchmark_quantiles_and_author():
    """
    Plots the quantiles for a benchmark and an author.
    """
    # The ID of the benchmark.
    benchmark = request.args.get('benchmark', None)

    # The ID of the author.
    author = request.args.get('author', None)

    # The query of the benchmark.
    query = db.engine.execute(
        text('SELECT query FROM benchmark WHERE id = :id'),
        id=benchmark).fetchone()[0]

    # The citations per year for all the authors that are described by
    # the benchmark.
    rows = db.engine.execute(text('SELECT a.name, a.scholar_id, c.year, c.citations ' +
                                  'FROM author_citations_per_year c, author a ' +
                                  'WHERE a.id = c.author_id ' +
                                  'AND (c.author_id IN (' + query + ') ' +
                                  'OR c.author_id = ' + author + ') ' +
                                  'AND a.organization_id IS NOT NULL ' +
                                  'AND a.retrieved_at IS NOT NULL ' +
                                  'ORDER BY a.scholar_id, c.year'))
    data = []
    age = 0
    previous_scholar_id = None
    for row in rows:
        author_name = row[0]
        scholar_id = row[1]
        total_citations = row[3]
        if scholar_id != previous_scholar_id:
            age = 0
        datum = {'Name': author_name + ' (' + scholar_id + ')',
                 'Age': age,
                 'Total citations': total_citations}
        data.append(datum)
        previous_scholar_id = scholar_id
        age += 1

    # The name and the Google Scholar ID of the author.
    row = db.engine.execute(text('SELECT name, scholar_id ' +
                                 'FROM author WHERE id = :id'),
                            id=author).fetchone()
    author_name = row[0]
    author_scholar_id = row[1]

    # Plot.
    data_frame = pandas.DataFrame.from_dict(data)
    byyear = data_frame.pivot(index='Age', columns='Name',
                              values='Total citations')
    totals = data_frame.pivot(index='Age', columns='Name',
                              values='Total citations').cumsum()
    byyear_sum = totals.fillna(method='pad').transpose()
    try:
        p = byyear[[author_name + ' (' + author_scholar_id + ')']].cumsum()
    except KeyError:
        return send_file(ERRORIMAGE)
    quantiles = [0.5, 0.7, 0.8, 0.9, 0.95, 0.99]
    q = byyear_sum.quantile(quantiles).transpose()
    m = pandas.merge(p, q, how='inner', left_index=True,
                     right_index=True, sort=True, copy=True,
                     indicator=False)
    plt.clf()
    axes = m.plot(figsize=(16, 8), legend=True, logy=True,
                  color=['r', '0', '0', '0', '0', '0', '0'], alpha=0.5)

    axes.set_title('Author Rank(%) per Year (Cumulative) vs Benchmarks')
    # Send the plot.
    figure = axes.get_figure()
    canvas = figure.canvas
    output = StringIO.StringIO()
    canvas.print_png(output)
    response = make_response(output.getvalue())
    response.mimetype = 'image/png'
    return response


@app.route('/dashboard/benchmark-average-ranks', methods=['GET'])
def get_benchmark_average_ranks():
    """
    Gets the average ranks for a benchmark.
    """

    # The ID of the benchmark.
    benchmark = request.args.get('benchmark', None)

    # The query of the benchmark.
    query = db.engine.execute(text('SELECT query ' +
                                   'FROM benchmark ' +
                                   'WHERE id = :id'),
                              id=benchmark).fetchone()[0]

    # The citations per year for all the authors that are described by
    # the benchmark.
    rows = db.engine.execute(
        text(
            'SELECT a.name, a.scholar_id, c.year, c.citations FROM author_citations_per_year c, author a WHERE a.id = c.author_id AND c.author_id IN (' +
            query +
            ') AND a.organization_id IS NOT NULL AND a.retrieved_at IS NOT NULL ORDER BY a.scholar_id, c.year'))
    data = []
    age = 0
    previous_scholar_id = None
    for row in rows:
        author_name = row[0]
        scholar_id = row[1]
        total_citations = row[3]
        if scholar_id != previous_scholar_id:
            age = 0
        datum = {'Name': author_name + ' (' + scholar_id + ')',
                 'Age': age,
                 'Total citations': total_citations}
        data.append(datum)
        previous_scholar_id = scholar_id
        age += 1

    data_frame = pandas.DataFrame.from_dict(data)
    byyear = data_frame.pivot(index='Age', columns='Name',
                              values='Total citations')
    rank = byyear.rank(axis=1, pct=True)
    leaderboard = rank.mean(axis=0, skipna=True) \
                      .sort_values(ascending=False)
    average_ranks = []
    if len(leaderboard.index):
        for index, row in leaderboard.iteritems():
            average_rank = {'Name': index,
                            'Average rank': "{0:.2f}%".format(row * 100)}
            average_ranks.append(average_rank)
    result = {'average_ranks': average_ranks}
    return jsonify(**result)


@app.route('/dashboard/author-rank-over-time', methods=['GET'])
def plot_author_rank_over_time():
    """
    Plots the rank of an author over time.
    """

    # The ID of the author.
    author = request.args.get('author', None)

    # The ID of the benchmark.
    benchmark = request.args.get('benchmark', None)

    # The query of the benchmark.
    query = db.engine.execute(text('SELECT query ' +
                                   'FROM benchmark ' +
                                   'WHERE id = :id'),
                              id=benchmark).fetchone()[0]

    # The citations per year for all the authors that are described by
    # the benchmark.
    rows = db.engine.execute(text('SELECT a.name, a.scholar_id, c.year, c.citations ' +
                                  'FROM author_citations_per_year c, author a ' +
                                  'WHERE a.id = c.author_id ' +
                                  'AND (c.author_id IN (' + query + ') ' +
                                  'OR c.author_id = ' + author + ') ' +
                                  'AND a.organization_id IS NOT NULL ' +
                                  'AND a.retrieved_at IS NOT NULL ' +
                                  'ORDER BY a.scholar_id, c.year'))

    data = []
    age = 0
    previous_scholar_id = None
    for row in rows:
        author_name = row[0]
        scholar_id = row[1]
        total_citations = row[3]
        if scholar_id != previous_scholar_id:
            age = 0
        datum ={'Name': author_name + ' (' + scholar_id + ')',
                'Age': age,
                'Total citations': total_citations}
        data.append(datum)
        previous_scholar_id = scholar_id
        age += 1

    # The name and the Google Scholar ID of the author.
    row = db.engine.execute(text('SELECT name, scholar_id ' +
                                 'FROM author ' +
                                 'WHERE id = :id'),
                            id=author).fetchone()
    author_name = row[0]
    author_scholar_id = row[1]

    data_frame = pandas.DataFrame.from_dict(data)
    byyear = data_frame.pivot(index='Age', columns='Name',
                              values='Total citations')
    rank = byyear.rank(axis=1, pct=True)
    plt.clf()

    try:
        axes = rank[author_name + ' (' + author_scholar_id + ')'].plot()
    except KeyError:
        return send_file(ERRORIMAGE)

    axes.set_title('Author Rank(%) per Individual Year')

    # Send the plot.
    figure = axes.get_figure()
    canvas = figure.canvas
    output = StringIO.StringIO()
    canvas.print_png(output)
    response = make_response(output.getvalue())
    response.mimetype = 'image/png'
    return response



@app.route('/dashboard/citations_percentiles', methods=['GET'])
def plot_citations_yearly():
    """
    parameter: span='yearly' or 'cumulative'
    """

    span = request.args.get('span', 'yearly')

    percentiles_yearly = pandas.read_csv('percentiles_yearly.csv').set_index('Age')
    percentiles_cumulative = pandas.read_csv('percentiles_cumulative.csv').set_index('Age')
    percentiles_yearly = percentiles_yearly[:30]

    pass


@app.route('/dashboard/scholarly_search', methods=['GET'])
def scholarly_search():
    """
    parameter: author
    """

    author = request.args.get('author', None)
    if author:
        authors = []
        search_query = scholarly.search_author(author)
        try:
            authors = list(search_query)
            authors = [{"name": auth.name, "affiliation": auth.affiliation} for auth in authors]
        except StopIteration as e:
            return jsonify(**{'error': 'Scholarly did not find author'})
        return jsonify(**{"results": authors})
    else:
        return jsonify(**{"results": []})



@app.route('/dashboard/search_name', methods=['GET'])
def scholarly_search_name():
    """
        Run this to autocomplete.
        Params are author_name and refresh
    """

    a_name = request.args.get('author')
    refresh = request.args.get('refresh')
    tsess = Session()
    author = tsess.query(TempAuthor).filter(FullTextSearch(a_name, TempAuthor)).all()
    print [[a.name, a.scholar_id] for a in list(author)]

    if not refresh and author:
        return jsonify({
        'from': 'db',
        'results': [{
            'name': a.name,
            'affiliation': a.organization,
            'scholar_id': a.scholar_id,
        } for a in list(author)]}) # [vars(a) for a in list(author)]})

    author = a_name
    if author:
        authors = []
        search_query = scholarly.search_author(author)
        try:
            authors = list(search_query)
            authors = [{
                "name": auth.name,
                "affiliation": auth.affiliation,
                "scholar_id": auth.id
            } for auth in authors]

        # Start running the analysis for the authors

            subprocess.Popen(
                    [
                        "python2",
                        "fetch_profile.py",
                        "author"
                    ] + author.split(" ")
            )
        except StopIteration as e:
            return jsonify(**{'error': 'Scholarly did not find author'})
        return jsonify(**{"results": authors})
    else:
        return jsonify(**{"results": []})


@app.route('/dashboard/search_scholarid', methods=['GET'])
def db_scholarly_search():
    """
    Run this to initiate a search in the background.
    When this returns 'msg: success', it's safe to invoke analysis
    """
    profile = request.args.get('profile')
    a_name = request.args.get('author')
    refresh = request.args.get('refresh')

    if profile is None:
        return jsonify(**{"results": []})

    tsess = Session()
    author = tsess.query(TempAuthor)\
            .filter(TempAuthor.scholar_id == profile)\
            .order_by(TempAuthor.id.desc())\
            .first()
    print "\n", profile, a_name, "\n", author

    auth = author.json_all if author else None

    if (author is None or refresh) and a_name:
        # Start a search
        subprocess.Popen(["python2", "fetch_profile.py", "author"] + a_name.split(" "))
        print "Starting a search"
        return jsonify(**{"author": auth, "msg": "Initiated a search"})

    if author.status == "Processing":
        return jsonify(**{"author": auth, "msg": "Try Again Later"})

    if author.status == "Filled":
        return jsonify(**{"author": auth, "msg": "Success"})

    return jsonify(**{"msg": "error"})


@app.route('/dashboard/citations_percentiles_author_report', methods=['GET'])
def author_report():
    """
    parameter: author
    """
    renew_session()

    per_year = pandas.read_csv('percentiles_yearly.csv').set_index('Age')
    per_cum = pandas.read_csv('percentiles_cumulative.csv').set_index('Age')
    per_year = per_year[:30]

    profile = request.args.get('profile')

    if profile is None:
        return jsonify(**{"results": []})

    print 'Profile: ', profile

    tsess = Session()
    author = tsess.query(TempAuthor)\
            .filter(TempAuthor.scholar_id == profile)\
            .order_by(TempAuthor.id.desc())\
            .first()

    if not author:
        return jsonify(**{'error': 'Author not found'})

    author = author.json_all if author else None
    print author['name'],\
        author['affiliation'],\
        author['id'], "\n",\
        author



    # search_query = scholarly.search_author(author)
    # print(search_query)

    #try:
    #    author = next(search_query).fill()
    #except StopIteration as e:
    #    return jsonify(**{'error': 'Scholarly did not find author'})

    df_author = analyze_author_profile(author, per_cum)


    plt.rcParams['figure.figsize'] = (20, 10)
    # Plot 6
    percentiles_to_plot = [99.9, 99.8, 99.7, 99.5, 99, 97.5, 95, 90, 85, 75, 50, 25]
    percentiles_to_plot = [str(float(p)) for p in percentiles_to_plot]
    logy = True
    title = "Yearly Number of Citations for Different Percentiles. Benchmark: "+ 'All'
    filename = "plots/benchmark_yearly_linear_"+ 'All' +".png"
    plot6 = plot_benchmark64(per_year[percentiles_to_plot], logy, title,filename)

    # Plot 7
    ax = per_year.idxmax().rolling(window=10).mean().plot(grid=True)

    xtick = 10*numpy.linspace(0,100,101)
    ax.set_xticks(xtick, minor=True )
    ax.grid('on', which='minor', axis='x', linestyle='-', linewidth=0.25 )
    ax.grid('on', which='major', axis='x' )

    plot7 = base64_plot()

    # Plot 8

    logy = True
    title = "Cumulative Number of Citations for a Publication, for Different Percentiles"
    filename = "plots/benchmark_cumulative_linear_"+ 'All' +".png"
    plot8 = plot_benchmark64(per_cum[percentiles_to_plot], logy, title,filename)

    prof = df_author.sort_values('percentile', ascending=False).to_dict('records')

    # Plot 1
    ax = df_author.percentile.hist(cumulative=True, bins=200, normed=True, alpha=0.5, figsize=(10,10))
    sns.kdeplot(df_author.percentile, shade=True, color="b", bw=5, clip=(0,100), cut=0, cumulative=True, ax = ax)

    ax.set_xlim(0,100)
    ax.set_xlabel("Percentile Score")
    xtick = numpy.linspace(0,100,51)
    ax.set_xticks( xtick, minor=True )
    ax.grid('on', which='minor', axis='x', linestyle='-', linewidth=0.25 )
    ax.grid('on', which='major', axis='x' )

    ax.set_ylim(0,1)
    ax.set_ylabel("% of papers")
    ytick = numpy.linspace(0,1,51)
    ax.set_yticks( ytick, minor=True )
    ax.grid('on', which='minor', axis='y', linestyle='-', linewidth=0.25 )
    ax.grid('on', which='major', axis='y' )

    # Draw a diagonal line
    ax.plot(ax.get_xlim(), ax.get_ylim(), ls="--", c=".3")

    plot1 = base64_plot(reset=False)

    # Plot 2
    plt.figure()

    tmp = df_author.percentile.sort_values().reset_index().drop('index', axis='columns')
    ax = tmp.plot(figsize=(10, 10), grid=True)

    ax.set_ylim(0, 100)
    ax.set_xlim(0, len(tmp))

    ax.set_ylabel("Paper Score")
    ax.set_xlabel("Paper # (ranked by score from lowest to highest)")

    ax.set_xlim(0, len(tmp))
    xtick = numpy.linspace(0, len(tmp))
    ax.set_xticks( xtick, minor=True )
    ax.grid('on', which='minor', axis='x', linestyle='-', linewidth=0.25 )
    ax.grid('on', which='major', axis='x')


    ax.set_ylim(0, 100)
    ytick = numpy.linspace(0, 100, 51)
    ax.set_yticks( ytick, minor=True)
    ax.grid('on', which='minor', axis='y', linestyle='-', linewidth=0.25)
    ax.grid('on', which='major', axis='y')

    # Draw a diagonal line
    ax.plot(ax.get_xlim(), ax.get_ylim(), ls="--", c=".3")

    plot2 = base64_plot()

    # Plot 3

    # Create one figure, with just one subplot (figure is the overall thing, ax corresponds to the individual plot[s] )
    ax= plt.subplot()
    # Increase the size of the plot

    sns.violinplot(data=df_author, x='year', y='percentile', color='orange', cut=0, gridsize=100, ax=ax)
    ax.set_title("Distribution of citations Percentiles per Year", fontsize='x-large')
    ax.get_figure().set_size_inches(20, 5)

    plot3 = base64_plot()

    # Plot 4

    ax = df_author.pivot_table(
        index='year',
        values=['percentile'],
        aggfunc='max',
    ).plot()


    ax.set_title("Citations Percentile (Max per Year)", fontsize='x-large')
    plot4 = base64_plot()

    # Plot 5

    ax = df_author.pivot_table(
        index='year',
        values=['percentile'],
        aggfunc='mean',
    ).plot()

    ax.set_title("Citations Percentile (Mean per Year)", fontsize='x-large')
    plot5 = base64_plot()

    plots = [plot1, plot2, plot3, plot4, plot5, plot6, plot7, plot8]

    terminal_sum = int(df_author.sum().terminal_citations)

    terminal_sum = "{:,}".format(terminal_sum)

    plt.close('all')
    return jsonify(**{'pubs': prof, 'plots': plots, 'title': terminal_sum})

def plot_benchmark64(percentiles, logy, title, filename):
    fig, ax = plt.subplots()
    percentiles.plot(logy=logy, alpha=0.8, grid=True, figsize=(16, 8), ax = ax, marker='o', markersize=3)
    ax.set_title(title, fontsize='x-large')
    ax.set_ylabel("Number of Citations", fontsize='x-large')
    ax.set_xlabel("Age (Years since publication)", fontsize='x-large')
    ax.legend(fancybox=True, frameon = True, loc="upper left", ncol=3)
    ax.grid(b=True, which='minor', color='#DDDDDD', linestyle='--')

    n = len(percentiles)
    xtick = numpy.linspace(0, n, n+1)
    ax.set_xticks( xtick, minor=True )
    ax.grid('on', which='minor', axis='x', linestyle='-', linewidth=0.5 )
    ax.grid('on', which='major', axis='x' )
    return base64_plot()


def base64_plot(reset=True):
    csIO = cStringIO.StringIO()
    plt.savefig(csIO, format='png')
    csIO.seek(0)
    ret = base64.b64encode(csIO.read())
    if reset:
        plt.gcf().clear()
        plt.figure()
    return ret


def get_percentile(age, citations, percentiles_cumulative):
    '''
    Returns the percentile for a paper that has a given age, and achieved a certain number of citations by now
    '''
    c = percentiles_cumulative.loc[age]
    for p in c.index:
        if c[p]>citations:
            percentile = float(p)
            terminal_citations = percentiles_cumulative.T.loc[str(percentile)].loc[40]
            return {
                "percentile": float(p),
                "terminal_citations_40": terminal_citations
            }
    return None


def analyze_author_profile(author, perc_cum):
    profile = []
    # NOTE that JSON results is just a dict
    year = datetime.now().year
    for pub in author['publications']:
        keys = pub.keys()
        if 'citedby' in keys and 'year' in pub['bib'] and pub['bib']['year'] < year + 1 and pub['bib']['year'] > 1980:
            pub_age = year - pub['bib']['year']+1
            pub_percentile_analysis = get_percentile(pub_age, pub['citedby'], perc_cum)
            percentile = pub_percentile_analysis.get("percentile")
            terminal = pub_percentile_analysis.get("terminal_citations_40")
            entry = {
                'title': pub['bib']['title'],
                'year': pub['bib']['year'],
                'age': pub_age,
                'citations': pub['citedby'],
                'percentile': percentile,
                'terminal_citations': terminal,
            }
            profile.append(entry)

    return pandas.DataFrame(profile)
