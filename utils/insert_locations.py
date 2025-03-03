import os
import mysql.connector
import csv
from dotenv import load_dotenv
import random


load_dotenv()


conn = mysql.connector.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME")
)
cursor = conn.cursor()

# Read the CSV file
csv_file_path = '../data/user_locations.csv'
with open(csv_file_path, 'r') as f:
    reader = csv.reader(f)
    header = next(reader)  # Skip the header row
    travel_wishes = list(reader)  # Read the rest of the rows

# Fetch user IDs from the survey_responses table
cursor.execute("SELECT id FROM survey_responses")
user_ids = [row[0] for row in cursor.fetchall()]


if len(user_ids) < 1000:
    raise ValueError("Not enough user IDs in survey_responses to match travel wishes.")

# Shuffle the user IDs to assign them randomly
random.shuffle(user_ids)

# Prepare the data for insertion
data_to_insert = []
for i, row in enumerate(travel_wishes[:1000]):  # Only process the first 1000 rows
    current_country, current_region, next_country, next_region = row
    survey_id = user_ids[i]  # Assign a random user ID
    data_to_insert.append((survey_id, current_country, current_region, next_country, next_region))

# Define the INSERT query
insert_query = """
    INSERT INTO user_locations (survey_id, current_country, current_region, next_country, next_region) 
    VALUES (%s, %s, %s, %s, %s)
"""

# Execute the INSERT query
cursor.executemany(insert_query, data_to_insert)

# Commit the transaction
conn.commit()

# Close the cursor and connection
cursor.close()
conn.close()

print("Inserted 1000 locations successfully!")