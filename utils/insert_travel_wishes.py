import os
import mysql.connector
import csv
from datetime import datetime
from dotenv import load_dotenv
import pandas as pd
import random
import json

with open('../data/travel_wishes.json', 'r') as f:
    travel_wishes = json.load(f)

load_dotenv()

conn = mysql.connector.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME")
)
cursor = conn.cursor()


cursor.execute("SELECT id FROM survey_responses")
user_ids = [row[0] for row in cursor.fetchall()]

if len(user_ids) < 1000:
    raise ValueError("Not enough user IDs in survey_responses to match travel wishes.")

random.shuffle(user_ids)

insert_query = "INSERT INTO travel_wishes (survey_id, wish_text) VALUES (%s, %s)"
data_to_insert = list(zip(user_ids[:1000], travel_wishes)) 

cursor.executemany(insert_query, data_to_insert)

conn.commit()
cursor.close()
conn.close()

print("Inserted 1000 travel wishes successfully!")
