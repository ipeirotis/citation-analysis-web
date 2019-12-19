from config import Config
from flask import Flask

# Create the application.
app = Flask(__name__)

# Configure the application.
app.config.from_object(Config)

# Bind the database to the application.
from app.models import db
db.init_app(app)

with app.app_context():

    # Set up the controllers.
    from . import controllers


@app.route('/')
def welcome():
    """
    Welcomes.
    """
    return app.send_static_file('index.html')


@app.route('/<path:resource>')
def serve(resource):
    """
    Serves the static resource.
    """
    return app.send_static_file(resource)
