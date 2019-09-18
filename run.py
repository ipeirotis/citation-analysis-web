from app import app


def run():
    """
    Runs the application.
    """
    app.run(host=app.config.get('HOST', '0.0.0.0'), port=int(app.config.get('PORT', 4242)))

if __name__ == "__main__":
    run()
