import os
import mysql.connector
import csv
from datetime import datetime
from dotenv import load_dotenv
import pandas as pd

load_dotenv()


db_config = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
}

conn = mysql.connector.connect(**db_config)
cursor = conn.cursor()

csv_path = '../data/mock_data.csv'

with open(csv_path, 'r') as file:
    reader = csv.DictReader(file)
    
    for row in reader:

        # HANDLING MISSING VALUES FROM CSV
        date = row['date']
        solo_travel = 1 if row['solo_travel'].upper() == 'TRUE' else 0
        age = row['age'] if row['age'] else None
        trip_count = row['trip_count'] if row['trip_count'] else None
        travel_reason = row['travel_reason'] if row['travel_reason'] else None
        trip_enjoyment = row['trip_enjoyment'] if row['trip_enjoyment'] else None

        spontaneity = row['spontaneity']
        spontaneity = int(spontaneity) if spontaneity else None

        enjoyment_rate = row['enjoyment_rate']
        enjoyment_rate = int(enjoyment_rate) if enjoyment_rate else None 
        
        next_destination = 1 if row['next_destination'].upper() == 'TRUE' else 0

        # date = datetime.now()
        
        cursor.execute("""
            INSERT INTO survey_responses (date, solo_travel, age, trip_count, travel_reason, 
            trip_enjoyment, spontaneity, next_destination, enjoyment_rate) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (date, solo_travel, age, trip_count, travel_reason, trip_enjoyment, spontaneity, next_destination, enjoyment_rate))

    
    conn.commit()

cursor.close()
conn.close()

print("Data inserted successfully!")
