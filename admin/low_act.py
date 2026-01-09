
import csv

INPUT_FILE = "users.csv"

with open(INPUT_FILE, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        actions = row.get("actions")
        try:
            actions = float(actions) if actions else 0
        except ValueError:
            actions = 0
        if actions < 1000:
            email = row.get("email")
            if email:
                print(email)

