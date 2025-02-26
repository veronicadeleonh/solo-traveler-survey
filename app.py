import os
from flask import Flask, request, render_template, jsonify
import mysql.connector
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

app = Flask(__name__)


def get_db_connection():
    connection = mysql.connector.connect(**db_config)
    return connection


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


# SUBMIT FORM
@app.route("/submit_survey", methods=["POST"])
def submit_survey():

    # print("Request form", request.form)

    data = {
        'solo_travel': request.form.get("solo_travel", "no") == "yes",
        'trip_count': request.form.get("trip_count", ""),
        'travel_reason': request.form.get("travel_reason", ""),
        'trip_enjoyment': request.form.get("trip_enjoyment", ""),
        'spontaneity': request.form.get("spontaneity", type=int),
        'next_destination': request.form.get("next_destination", "no") == "yes",
        'enjoyment_rate': request.form.get("enjoyment_rate", type=int),
        'travel_wishes': request.form.get("travel_wishes", "").strip(),
    }

    print(f"Received: {data}")

    df = pd.DataFrame([data])

    # TREATING MISSING VALUES
    df['solo_travel'] = df['solo_travel'].fillna(df['solo_travel'].mode()[0])
    df['trip_count'] = df['trip_count'].fillna(df['trip_count'].mode()[0])
    df['travel_reason'] = df['travel_reason'].fillna(df['travel_reason'].mode()[0])
    df['spontaneity'] = pd.to_numeric(df['spontaneity'], errors='coerce').fillna(df['spontaneity'].mean())
    df['next_destination'] = df['next_destination'].fillna(df['next_destination'].mode()[0])
    df['enjoyment_rate'] = pd.to_numeric(df['enjoyment_rate'], errors='coerce').fillna(df['enjoyment_rate'].mean())

    solo_travel = bool(df['solo_travel'].iloc[0])
    trip_count = df['trip_count'].iloc[0]
    travel_reason = df['travel_reason'].iloc[0]
    trip_enjoyment = df['trip_enjoyment'].iloc[0]
    spontaneity = int(df['spontaneity'].iloc[0])
    next_destination = bool(df['next_destination'].iloc[0])
    enjoyment_rate = int(df['enjoyment_rate'].iloc[0])
    travel_wishes = df['travel_wishes'].iloc[0] if df['travel_wishes'].iloc[0] else "No answer"

    # SENTIMENT PREDICTION
    if not travel_wishes or travel_wishes.lower() == "no answer":
        sentiment = "No sentiment detected"
    else:
        processed_sentiment = preprocess_text(travel_wishes)
        vectorized_sentiment = sentiment_vectorizer.transform([processed_sentiment])
        sentiment = sentiment_model.predict(vectorized_sentiment)[0] 

    # CLUSTER PREDICTION
    cluster = predict_cluster(travel_reason, spontaneity)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO survey_responses 
                    (date, solo_travel, trip_count, travel_reason, trip_enjoyment, spontaneity, next_destination, enjoyment_rate) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        datetime.now(),
                        solo_travel,
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

    
# TOTAL SUBMISSIONS
@app.route('/total_submissions', methods=['GET'])
def total_submissions():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM survey_responses")
        total = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return jsonify({"total_submissions": total})

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# SOLO TRAVEL COUNT
@app.route('/get_solo_travel_count', methods=['GET'])
def get_solo_travel_count():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                solo_travel,
                COUNT(solo_travel)
            FROM survey_responses
            GROUP BY solo_travel;
        """)

        results = cursor.fetchall()

        labels = ['Solo Travel' if result[0] == 1 else 'Not Solo Travel' for result in results]
        counts = [result[1] for result in results]

        return jsonify({'labels': labels, 'counts': counts})

    except mysql.connector.Error as err:
        return f"Error: {err}"



# TRIP COUNT CHART
@app.route('/get_trip_count', methods=['GET'])
def get_trip_count():
    try:
        with get_db_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute("""
                               SELECT trip_count, COUNT(*) AS count 
                               FROM survey_responses
                               WHERE trip_count IS NOT NULL 
                               GROUP BY trip_count
                               ORDER BY trip_count ASC
                               """)
                trip_count_data = cursor.fetchall()

                labels = [row['trip_count'] for row in trip_count_data]
                values = [row['count'] for row in trip_count_data]

        return jsonify(labels=labels, values=values)

    except mysql.connector.Error as err:
        return jsonify({"error": f"Database error: {err}"}), 500

    

# TRAVEL REASON COUNT
@app.route('/get_travel_reason_data', methods=['GET'])
def get_travel_reason_data():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                travel_reason, 
                SUM(CASE WHEN solo_travel = 1 THEN 1 ELSE 0 END) AS solo_count,
                SUM(CASE WHEN solo_travel = 0 THEN 1 ELSE 0 END) AS non_solo_count
            FROM survey_responses
            WHERE travel_reason IS NOT NULL
            GROUP BY travel_reason
        """)

        results = cursor.fetchall()

        labels = [row['travel_reason'] for row in results]
        solo_counts = [row['solo_count'] for row in results]
        non_solo_counts = [row['non_solo_count'] for row in results]

        return jsonify(labels=labels, solo_counts=solo_counts, non_solo_counts=non_solo_counts)

    except mysql.connector.Error as err:
        return jsonify({"error": str(err)})

    finally:
        cursor.close()
        conn.close()



# SPONTANEITY VS ENJOYMENT RATE
@app.route('/get_spontaneity_enjoyment', methods=['GET'])
def get_spontaneity_enjoyment():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT spontaneity, enjoyment_rate
            FROM survey_responses
            WHERE solo_travel = 1  -- Only solo travelers
            AND spontaneity IS NOT NULL 
            AND enjoyment_rate IS NOT NULL
        """)

        results = cursor.fetchall()

        spontaneity = [row['spontaneity'] for row in results]
        enjoyment = [row['enjoyment_rate'] for row in results]

        return jsonify(spontaneity=spontaneity, enjoyment=enjoyment)

    except mysql.connector.Error as err:
        return jsonify({"error": str(err)})

    finally:
        cursor.close()
        conn.close()


# SUBMISSIONS OVER TIME
@app.route('/get_submissions_over_time', methods=['GET'])
def get_submissions_over_time():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
            DATE_FORMAT(date, '%m-%d-%y') AS submission_date,
            COUNT(*) AS submission_count
            FROM survey_responses
            WHERE date BETWEEN '2025-02-01' AND NOW()
            GROUP BY submission_date
            ORDER BY submission_date;
        """)
        results = cursor.fetchall()

        labels = [row['submission_date'] for row in results]
        values = [row['submission_count'] for row in results]

        return jsonify(labels=labels, values=values)

    except mysql.connector.Error as err:
        return f"Error: {err}"

    finally:
        cursor.close()
        conn.close()


# GET DASHBOARD STATS
@app.route('/get_dashboard_stats', methods=['GET'])
def get_dashboard_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) AS total FROM survey_responses")
        total_submissions = cursor.fetchone()['total']

        cursor.execute("""
            SELECT COUNT(*) AS new_today
            FROM survey_responses
            WHERE DATE(date) = CURDATE()
        """)
        new_today = cursor.fetchone()['new_today']

        cursor.execute("""
            SELECT 
                (COUNT(CASE WHEN solo_travel = 1 THEN 1 END) / COUNT(*)) * 100 AS solo_percentage
            FROM survey_responses
        """)
        solo_percentage = cursor.fetchone()['solo_percentage']

        cursor.execute("SELECT AVG(enjoyment_rate) AS avg_enjoyment FROM survey_responses")
        avg_enjoyment = cursor.fetchone()['avg_enjoyment']

        return jsonify({
            "total_submissions": total_submissions,
            "new_today": new_today,
            "solo_percentage": round(solo_percentage, 2),
            "avg_enjoyment": round(avg_enjoyment, 2),
            "today_date": str(datetime.today())
        })

    except mysql.connector.Error as err:
        print(f"Error: {str(err)}")  # Log the error to the console
        return jsonify({"error": str(err)})

    finally:
        cursor.close()
        conn.close()



if __name__ == "__main__":
    app.run(debug=True)



# @app.route('/get_data', methods=['GET'])
# def get_data():
#     data_type = request.args.get('type')  # Get query parameter

#     queries = {
#         "solo_travel_count": """
#             SELECT solo_travel, COUNT(solo_travel) FROM survey_responses GROUP BY solo_travel
#         """,
#         "trip_count": """
#             SELECT trip_count, COUNT(*) AS count 
#             FROM survey_responses
#             WHERE trip_count IS NOT NULL 
#             GROUP BY trip_count
#             ORDER BY trip_count ASC
#         """,
#         "travel_reason_data": """
#             SELECT travel_reason, 
#                    SUM(CASE WHEN solo_travel = 1 THEN 1 ELSE 0 END) AS solo_count,
#                    SUM(CASE WHEN solo_travel = 0 THEN 1 ELSE 0 END) AS non_solo_count
#             FROM survey_responses
#             WHERE travel_reason IS NOT NULL
#             GROUP BY travel_reason
#         """,
#         "spontaneity_enjoyment": """
#             SELECT spontaneity, enjoyment_rate
#             FROM survey_responses
#             WHERE solo_travel = 1 
#             AND spontaneity IS NOT NULL 
#             AND enjoyment_rate IS NOT NULL
#         """,
#         "submissions_over_time": """
#             SELECT DATE_FORMAT(date, '%Y-%m-%d %H:00:00') AS submission_date,
#                    COUNT(*) AS submission_count
#             FROM survey_responses
#             WHERE date BETWEEN '2025-02-01 00:00:00' AND NOW()
#             GROUP BY submission_date
#             ORDER BY submission_date
#         """,
#         "dashboard_stats": """
#             SELECT 
#                 (SELECT COUNT(*) FROM survey_responses) AS total_submissions,
#                 (SELECT COUNT(*) FROM survey_responses WHERE DATE(date) = CURDATE()) AS new_today,
#                 (SELECT (COUNT(CASE WHEN solo_travel = 1 THEN 1 END) / COUNT(*)) * 100 FROM survey_responses) AS solo_percentage,
#                 (SELECT AVG(enjoyment_rate) FROM survey_responses) AS avg_enjoyment
#         """
#     }

#     if data_type not in queries:
#         return jsonify({"error": "Invalid type parameter"}), 400

#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor(dictionary=True)

#         cursor.execute(queries[data_type])
#         results = cursor.fetchall()

#         if data_type == "solo_travel_count":
#             response = {
#                 "labels": ['Solo Travel' if row['solo_travel'] == 1 else 'Not Solo Travel' for row in results],
#                 "counts": [row['COUNT(solo_travel)'] for row in results]
#             }
#         elif data_type == "trip_count":
#             response = {
#                 "labels": [row['trip_count'] for row in results],
#                 "values": [row['count'] for row in results]
#             }
#         elif data_type == "travel_reason_data":
#             response = {
#                 "labels": [row['travel_reason'] for row in results],
#                 "solo_counts": [row['solo_count'] for row in results],
#                 "non_solo_counts": [row['non_solo_count'] for row in results]
#             }
#         elif data_type == "spontaneity_enjoyment":
#             response = {
#                 "spontaneity": [row['spontaneity'] for row in results],
#                 "enjoyment": [row['enjoyment_rate'] for row in results]
#             }
#         elif data_type == "submissions_over_time":
#             response = {
#                 "labels": [row['submission_date'] for row in results],
#                 "values": [row['submission_count'] for row in results]
#             }
#         elif data_type == "dashboard_stats":
#             response = {
#                 "total_submissions": results[0]['total_submissions'],
#                 "new_today": results[0]['new_today'],
#                 "solo_percentage": round(results[0]['solo_percentage'], 2),
#                 "avg_enjoyment": round(results[0]['avg_enjoyment'], 2),
#                 "today_date": str(datetime.today())
#             }
#         else:
#             response = results  # Default case

#         return jsonify(response)

#     except mysql.connector.Error as err:
#         return jsonify({"error": str(err)}), 500

#     finally:
#         cursor.close()
#         conn.close()

# // GET DASHBOARD DATA
# @app.route('/get_dashboard_data', methods=['GET'])
# def get_dashboard_data():
#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor(dictionary=True)

#         # SOLO TRAVEL COUNT
#         cursor.execute("""
#             SELECT solo_travel, COUNT(*) AS count
#             FROM survey_responses
#             WHERE solo_travel IS NOT NULL
#             GROUP BY solo_travel
#         """)

#         solo_travel_data = {row['solo_travel']: row['count'] for row in cursor.fetchall()}

#         # TRAVEL REASON COUNTS
#         cursor.execute("""
#             SELECT travel_reason, COUNT(*) AS count
#             FROM survey_responses
#             WHERE travel_reason IS NOT NULL
#             GROUP BY travel_reason
#         """)
#         travel_reason_data = cursor.fetchall()

#         # SUBMISSIONS OVER TIME
#         cursor.execute("""
#             SELECT DATE(submission_date) AS date, COUNT(*) AS count
#             FROM survey_responses
#             GROUP BY DATE(submission_date)
#         """)
#         submissions_over_time = cursor.fetchall()

#         # ENJOYMENT VS SPONTANEITY
#         cursor.execute("""
#             SELECT spontaneity_score, enjoyment_rate
#             FROM survey_responses
#             WHERE spontaneity_score IS NOT NULL AND enjoyment_rate IS NOT NULL
#         """)
#         enjoyment_vs_spontaneity = cursor.fetchall()

#         return jsonify({
#             "total_submissions": total_submissions,
#             "solo_travel": solo_travel_data,
#             "travel_reason_data": travel_reason_data,
#             "submissions_over_time": submissions_over_time,
#             "enjoyment_vs_spontaneity": enjoyment_vs_spontaneity
#         })

#     except mysql.connector.Error as err:
#         return jsonify({"error": str(err)})

#     finally:
#         cursor.close()
#         conn.close()