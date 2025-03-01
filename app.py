import os
from flask import Flask, request, render_template, jsonify
import mysql.connector
import mysql.connector.pooling
import pandas as pd
from datetime import datetime, date
from dotenv import load_dotenv
import joblib
import re


load_dotenv()

db_config = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
}

# CONNECTION POOL
db_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="my_pool",
    pool_size=5,  # Number of connections in the pool
    **db_config
)

app = Flask(__name__)

def get_db_connection():
    try:
        return db_pool.get_connection()
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        raise err

@app.route('/health', methods=['GET'])
def health_check():
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({"status": "healthy"}), 200
    except mysql.connector.Error as err:
        return jsonify({"status": "unhealthy", "error": str(err)}), 500


def fetch_data(query, params=None):
    """Generic function to fetch data from the database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        return results
    except mysql.connector.Error as err:
        raise err


def execute_query(query, params=None):
    """Generic function to execute a database query."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        conn.commit()
        cursor.close()
        conn.close()
    except mysql.connector.Error as err:
        raise err


# HOME
@app.route("/")
def home():
    return render_template("index.html")



# LOAD MODELS FOR THE UI

sentiment_model = joblib.load("pkl/sentiment_model.pkl")
sentiment_vectorizer = joblib.load("pkl/sentiment_vectorizer.pkl")
cluster_model = joblib.load("pkl/clustering_model.pkl")
cluster_pipeline = joblib.load("pkl/clustering_pipeline.pkl")


def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'\W+', ' ', text)
    return text


def predict_cluster(travel_reason, spontaneity):

    features = pd.DataFrame({
        'travel_reason': [travel_reason],
        'spontaneity': [spontaneity]
    })

    cluster = cluster_pipeline.predict(features)

    if cluster == 0:
        return "The Free Spirits - High spontaneity, embrace adventure and flexibility."
    elif cluster == 1:
        return "The Planners - Low spontaneity, prefer structure and well-planned trips."
    else:
        return "The Balanced Travelers - A mix of planning and flexibility depending on the trip."
    

def handle_null_values(data):
    """Replace '-' with None for all fields in the data dictionary."""
    for key, value in data.items():
        if value == "":
            data[key] = None
    return data


# SUBMIT FORM
@app.route("/submit_survey", methods=["POST"])
def submit_survey():

    # print("Request form", request.form)

    data = {
        'solo_travel': request.form.get("solo_travel", "no") == "yes",
        'age': request.form.get("age", ""),
        'trip_count': request.form.get("trip_count", ""),
        'travel_reason': request.form.get("travel_reason", ""),
        'trip_enjoyment': request.form.get("trip_enjoyment", ""),
        'spontaneity': request.form.get("spontaneity", type=int),
        'next_destination': request.form.get("next_destination", "no") == "yes",
        'enjoyment_rate': request.form.get("enjoyment_rate", type=int),
        'travel_wishes': request.form.get("travel_wishes", "").strip(),
    }

    data = handle_null_values(data)

    print(f"Received: {data}")

    df = pd.DataFrame([data])

    # TREATING MISSING VALUES
    # Handle text/categorical columns
    text_columns = ['age', 'trip_count', 'travel_reason', 'trip_enjoyment', 'travel_wishes']
    for col in text_columns:
        df[col] = df[col].fillna("Unknown")

    # Handle boolean columns
    df['solo_travel'] = df['solo_travel'].fillna(False)
    df['next_destination'] = df['next_destination'].fillna(False)

    # Handle numeric columns
    numeric_columns = ['spontaneity', 'enjoyment_rate']
    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

    # EXTRACT PROCESSED DATA
    solo_travel = bool(df['solo_travel'].values[0])
    age = df['age'].values[0]
    trip_count = df['trip_count'].values[0]
    travel_reason = df['travel_reason'].values[0]
    trip_enjoyment = df['trip_enjoyment'].values[0]
    spontaneity = int(df['spontaneity'].values[0])
    next_destination = bool(df['next_destination'].values[0])
    enjoyment_rate = int(df['enjoyment_rate'].values[0])
    travel_wishes = df['travel_wishes'].values[0]

    # SENTIMENT PREDICTION
    if not travel_wishes or travel_wishes.lower() == "no answer":
        sentiment = "No sentiment detected"
    else:
        processed_sentiment = preprocess_text(travel_wishes)
        vectorized_sentiment = sentiment_vectorizer.transform([processed_sentiment])
        sentiment = sentiment_model.predict(vectorized_sentiment)[0] 

    # CLUSTER PREDICTION
    if travel_reason in ["", "Unknown"]:
        cluster = "No cluster detected"
    else:
        cluster = predict_cluster(travel_reason, spontaneity)

    try:

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO survey_responses 
                    (date, solo_travel, age, trip_count, travel_reason, trip_enjoyment, spontaneity, next_destination, enjoyment_rate) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        datetime.now(),
                        solo_travel,
                        age,
                        trip_count,
                        travel_reason,
                        trip_enjoyment,
                        spontaneity,
                        next_destination,
                        enjoyment_rate,
                    ),
                )

                survey_id = cursor.lastrowid  # Get the inserted survey ID

                cursor.execute(
                    """
                    INSERT INTO travel_wishes (survey_id, wish_text) 
                    VALUES (%s, %s)
                    """,
                    (survey_id, travel_wishes),
                )
                conn.commit()

        return jsonify({"message": "Survey submitted!", "sentiment": sentiment, "travel_cluster": cluster})

    except mysql.connector.Error as err:
        return f"Error: {err}"


@app.route("/test_connection")
def test_connection():
    try:
        conn = get_db_connection()
        return "Connected to MySQL successfully!"
    except mysql.connector.Error as err:
        return f"Error: {err}"



# SOLO TRAVEL COUNT
@app.route('/get_solo_travel_count', methods=['GET'])
def get_solo_travel_count():
    try:
        results = fetch_data("""
            SELECT solo_travel, COUNT(solo_travel) AS count
            FROM survey_responses
            GROUP BY solo_travel;
        """)
        labels = ['Solo Travel' if row['solo_travel'] == 1 else 'Not Solo Travel' for row in results]
        counts = [row['count'] for row in results]
        return jsonify({'labels': labels, 'counts': counts})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# SUBMISSIONS OVER TIME
@app.route('/get_submissions_over_time', methods=['GET'])
def get_submissions_over_time():
    try:
        results = fetch_data("""
            SELECT DATE_FORMAT(date, '%m-%d-%y') AS submission_date, COUNT(*) AS submission_count
            FROM survey_responses
            WHERE date BETWEEN '2025-02-01' AND NOW()
            GROUP BY submission_date
            ORDER BY submission_date;
        """)
        labels = [row['submission_date'] for row in results]
        values = [row['submission_count'] for row in results]
        return jsonify(labels=labels, values=values)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# TRIP ENJOYMENT
@app.route('/get_trip_enjoyment', methods=['GET'])
def get_trip_enjoyment():
    try:
        results = fetch_data("""
            SELECT trip_enjoyment, 
	            SUM(CASE WHEN solo_travel = 1 THEN 1 ELSE 0 END) AS solo_count,
	            SUM(CASE WHEN solo_travel = 0 THEN 1 ELSE 0 END) AS non_solo_count
            FROM survey_responses
            WHERE trip_enjoyment IS NOT NULL AND trip_enjoyment != "" AND trip_enjoyment != "Unknown"
            GROUP BY trip_enjoyment;
        """)
        labels = [row['trip_enjoyment'] for row in results]
        solo_counts = [row['solo_count'] for row in results]
        non_solo_counts = [row['non_solo_count'] for row in results]
        return jsonify(labels=labels, solo_counts=solo_counts, non_solo_counts=non_solo_counts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# TRAVEL REASON COUNT
@app.route('/get_travel_reason_data', methods=['GET'])
def get_travel_reason_data():
    try:
        results = fetch_data("""
            SELECT travel_reason,
                   SUM(CASE WHEN solo_travel = 1 THEN 1 ELSE 0 END) AS solo_count,
                   SUM(CASE WHEN solo_travel = 0 THEN 1 ELSE 0 END) AS non_solo_count
            FROM survey_responses
            WHERE travel_reason IS NOT NULL AND travel_reason != "Unknown"
            GROUP BY travel_reason;
        """)
        labels = [row['travel_reason'] for row in results]
        solo_counts = [row['solo_count'] for row in results]
        non_solo_counts = [row['non_solo_count'] for row in results]
        return jsonify(labels=labels, solo_counts=solo_counts, non_solo_counts=non_solo_counts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# GET DASHBOARD STATS
@app.route('/get_dashboard_stats', methods=['GET'])
def get_dashboard_stats():
    try:
        total_submissions = fetch_data("SELECT COUNT(*) AS total FROM survey_responses")[0]['total']
        new_today = fetch_data("SELECT COUNT(*) AS new_today FROM survey_responses WHERE DATE(date) = CURDATE()")[0]['new_today']
        solo_percentage = fetch_data("SELECT (COUNT(CASE WHEN solo_travel = 1 THEN 1 END) / COUNT(*)) * 100 AS solo_percentage FROM survey_responses")[0]['solo_percentage']
        avg_enjoyment_solo = fetch_data("SELECT AVG(enjoyment_rate) AS avg_enjoyment_solo FROM survey_responses WHERE solo_travel = 1")[0]['avg_enjoyment_solo']
        avg_enjoyment_non_solo = fetch_data("SELECT AVG(enjoyment_rate) AS avg_enjoyment_non_solo FROM survey_responses WHERE solo_travel = 0")[0]['avg_enjoyment_non_solo']
        avg_spontaneity_solo = fetch_data("SELECT AVG(spontaneity) AS avg_enjoyment_solo FROM survey_responses WHERE solo_travel = 1")[0]['avg_enjoyment_solo']
        avg_spontaneity_non_solo = fetch_data("SELECT AVG(spontaneity) AS avg_enjoyment_non_solo FROM survey_responses WHERE solo_travel = 0")[0]['avg_enjoyment_non_solo']

        today_date = datetime.today().strftime("%B, %dth %Y")

        return jsonify({
            "total_submissions": total_submissions,
            "new_today": new_today,
            "solo_percentage": round(solo_percentage, 2),
            "today_date": today_date,
            "avg_enjoyment_solo": round(avg_enjoyment_solo),
            "avg_enjoyment_non_solo": round(avg_enjoyment_non_solo),
            "avg_spontaneity_solo": round(avg_spontaneity_solo),
            "avg_spontaneity_non_solo": round(avg_spontaneity_non_solo)

        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)

