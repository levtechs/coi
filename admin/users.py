
import csv
import requests
import time
import json

# ==============================
# CONFIG
# ==============================
BASE_URL = "https://coilearn.com"  # e.g. https://myapp.vercel.app
ADMIN_USERS_ENDPOINT = "/api/admin/users"
LIMIT = 50

# Paste a valid Firebase ID token here
FIREBASE_ID_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImQ4Mjg5MmZhMzJlY2QxM2E0ZTBhZWZlNjI4ZGQ5YWFlM2FiYThlMWUiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiTGV2IFNtb2xza3kiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jTHREbm5kZkZBNzN5WWNqZEdnbFdSLUNtREVvSTVBNUZfLTZaUkhEQVZWU01KbmlxUHc9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY29pLWY4MjQ4IiwiYXVkIjoiY29pLWY4MjQ4IiwiYXV0aF90aW1lIjoxNzY3ODAxMjM3LCJ1c2VyX2lkIjoiVDRnb0JoRkkyVGJsYkVCZ2lmd05sM2FURzExMiIsInN1YiI6IlQ0Z29CaEZJMlRibGJFQmdpZndObDNhVEcxMTIiLCJpYXQiOjE3Njc4ODM4MzAsImV4cCI6MTc2Nzg4NzQzMCwiZW1haWwiOiJzbW9sc2t5LmxldkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjEwNDI3OTM4MTk3ODEyMzU4ODE5NCJdLCJlbWFpbCI6WyJzbW9sc2t5LmxldkBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.h7Y_eOmDjEeUd6RHCv6L7bX-0V6dj-lSTVOh6DSxHh_rtU38SoSNXLyOyUfgewmIUPSvCf9thwInlEVRyYGkoesUVk4EDDBqJXzKeH1wOIWLsR7kjYg55MBGWMd18ezy4QFCGVRCwrolKH9Wuk7bzoW5GPFko3XJbL8IxNmGM9W08fjB0UEXmJDXhab7P2-d4LNL-mtdldodQkfptMMUQIjzUFGXl7KItxsyRB2NpmaduDW4hqXr8aTeScqYy02E4FQ7kx3NLZJFjCZphS04DSOiA4K9zMahUl10MklW7W_WJmAYG15KqXk4bJlvb4y8lDp60BVM42OsO1ymR8zZlA"

OUTPUT_FILE = "users.csv"

# ==============================
# FETCH USERS
# ==============================
def fetch_users(last_id=None):
    params = {"limit": LIMIT}
    if last_id:
        params["lastId"] = last_id

    headers = {
        "Authorization": f"Bearer {FIREBASE_ID_TOKEN}",
        "Content-Type": "application/json",
    }

    response = requests.get(
        BASE_URL + ADMIN_USERS_ENDPOINT,
        headers=headers,
        params=params,
        timeout=15,
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"Request failed ({response.status_code}): {response.text}"
        )

    return response.json().get("users", [])


# ==============================
# NORMALIZE USER OBJECT
# ==============================
def normalize_user(user):
    """
    Flattens user object safely for CSV.
    Nested objects are JSON-encoded.
    """
    flat = {}

    for key, value in user.items():
        if isinstance(value, (dict, list)):
            flat[key] = json.dumps(value, ensure_ascii=False)
        else:
            flat[key] = value

    return flat


# ==============================
# MAIN EXPORT
# ==============================
def export_all_users():
    all_users = []
    last_id = None

    while True:
        users = fetch_users(last_id)

        if not users:
            break

        for user in users:
            all_users.append(normalize_user(user))

        last_id = users[-1]["id"]
        print(f"Fetched {len(users)} users (total: {len(all_users)})")
        time.sleep(0.2)

    if not all_users:
        print("No users found.")
        return

    # Collect ALL possible fields dynamically
    fieldnames = set()
    for user in all_users:
        fieldnames.update(user.keys())

    fieldnames = sorted(fieldnames)

    # Write CSV
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_users)

    print(f"\n✅ Export complete → {OUTPUT_FILE}")
    print(f"🧾 Columns exported: {len(fieldnames)}")


if __name__ == "__main__":
    export_all_users()
