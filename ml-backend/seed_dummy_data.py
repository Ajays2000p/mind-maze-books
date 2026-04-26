import os
import random
import json
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# MongoDB Connection
client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/mind_maze_books"))
db = client.get_database()

def seed_data():
    print("Clearing existing ratings and books...")
    db.ratings.delete_many({})
    db.books.delete_many({})
    db.users.delete_many({"dummy": True}) # Clear previously seeded dummy users

    # Load books from enriched.json
    print("Loading books from enriched.json...")
    enriched_path = os.path.join(os.path.dirname(__file__), '..', 'enriched.json')
    with open(enriched_path, 'r', encoding='utf-8') as f:
        books_data = json.load(f)

    print(f"Seeding {len(books_data)} books from enriched.json...")
    book_ids = []
    
    # Deduplicate by title to avoid unique index violation
    seen_titles = set()
    unique_books = []
    for book in books_data:
        if book['title'] not in seen_titles:
            seen_titles.add(book['title'])
            
            # Ensure we don't have _id in the data that might conflict
            if '_id' in book: del book['_id']
            
            # Add basic fields if missing
            if 'rating' not in book: book['rating'] = 0
            if 'ratingCount' not in book: book['ratingCount'] = 0
            if 'popularityScore' not in book: book['popularityScore'] = random.randint(10, 1000)
            
            unique_books.append(book)

    print(f"Unique books count: {len(unique_books)}")
    res = db.books.insert_many(unique_books)
    book_ids = res.inserted_ids

    print("Seeding 30 dummy users and ratings...")
    human_names = ["Arun", "Varun", "Tarun", "Amit", "Rahul", "Suresh", "Ramesh", "Priya", "Anjali", "Neha", 
                   "Vikram", "Aditya", "Siddharth", "Ishaan", "Aavya", "Myra", "Kiara", "Zoya", "Aman", "Raj",
                   "Deepak", "Sunil", "Manish", "Karan", "Pooja", "Megha", "Ritika", "Kavya", "Arjun", "Kunal"]
    
    user_ids = []
    for i in range(30):
        name = human_names[i] if i < len(human_names) else f"User {i+1}"
        user = {
            "name": name,
            "email": f"{name.lower()}{i+1}@example.com",
            "password": "hashed_password", 
            "dummy": True
        }

        res = db.users.insert_one(user)
        user_ids.append(res.inserted_id)
        
        # 5-10 ratings per user
        num_ratings = random.randint(5, 10)
        selected_books = random.sample(book_ids, k=num_ratings)
        
        ratings = []
        for book_id in selected_books:
            ratings.append({
                "userId": res.inserted_id,
                "bookId": book_id,
                "value": random.randint(1, 5)
            })
        db.ratings.insert_many(ratings)

    # Update book aggregates (avg rating, count)
    print("Updating book aggregates...")
    for book_id in book_ids:
        ratings = list(db.ratings.find({"bookId": book_id}))
        if ratings:
            count = len(ratings)
            avg = sum(r["value"] for r in ratings) / count
            db.books.update_one(
                {"_id": book_id},
                {"$set": {"rating": round(avg, 1), "ratingCount": count}}
            )

    print("Seeding completed successfully!")

if __name__ == "__main__":
    seed_data()
