import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from pymongo import MongoClient
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB Connection
client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/mind_maze_books"))
db = client.get_database()

def get_weighted_rating_books(limit=10):
    books_cursor = db.books.find({}, {"_id": 1, "title": 1, "genres": 1, "rating": 1, "ratingCount": 1, "thumbnailUrl": 1, "author": 1})
    books = list(books_cursor)
    if not books: return []
    
    df = pd.DataFrame(books)
    C = df['rating'].mean()
    m = df['ratingCount'].quantile(0.75)
    
    def weighted_rating(x, m=m, C=C):
        v = x['ratingCount']
        R = x['rating']
        return (v/(v+m) * R) + (m/(m+v) * C)

    df['score'] = df.apply(weighted_rating, axis=1)
    df = df.sort_values('score', ascending=False)
    
    top_books = df.head(limit).to_dict(orient='records')
    for book in top_books:
        book['_id'] = str(book['_id'])
        book['recommendationReason'] = "Most highly recommended by readers"
    return top_books

def get_new_releases(limit=10):
    books = list(db.books.find({}).sort("createdAt", -1).limit(limit))
    for book in books:
        book['_id'] = str(book['_id'])
        book['recommendationReason'] = "Newly added to our library"
    return books

def get_user_based_recommendations(user_id, limit=10):
    try:
        ratings_cursor = db.ratings.find({})
        ratings_list = list(ratings_cursor)
        if len(ratings_list) < 10: return []

        df = pd.DataFrame(ratings_list)
        df['userId'] = df['userId'].apply(str)
        df['bookId'] = df['bookId'].apply(str)

        user_item_matrix = df.pivot_table(index='userId', columns='bookId', values='value').fillna(0)
        if user_id not in user_item_matrix.index: return []

        user_sim = cosine_similarity(user_item_matrix)
        user_sim_df = pd.DataFrame(user_sim, index=user_item_matrix.index, columns=user_item_matrix.index)

        similar_users = user_sim_df[user_id].sort_values(ascending=False)[1:6].index.tolist()
        
        recommended_book_ids = []
        user_rated_books = set(df[df['userId'] == user_id]['bookId'].tolist())

        for sim_user in similar_users:
            sim_user_ratings = df[(df['userId'] == sim_user) & (df['value'] >= 4)].sort_values(by='value', ascending=False)
            for _, row in sim_user_ratings.iterrows():
                if row['bookId'] not in user_rated_books and row['bookId'] not in recommended_book_ids:
                    recommended_book_ids.append(row['bookId'])
                if len(recommended_book_ids) >= limit: break
            if len(recommended_book_ids) >= limit: break

        books = list(db.books.find({"_id": {"$in": [ObjectId(bid) for bid in recommended_book_ids]}, "rating": {"$gte": 3.0, "$lte": 4.0}}))
        for book in books:
            book['_id'] = str(book['_id'])
            book['recommendationReason'] = "Recommended based on similar readers"
        return books
    except Exception as e:
        print(f"User CF Error: {e}")
        return []

@app.route('/api/recommendations', methods=['GET'])
def get_hybrid_recommendations():
    user_id = request.args.get('userId')
    
    response = {
        "mostRecommended": get_weighted_rating_books(12),
        "newArrivals": get_new_releases(12)
    }
    
    if user_id:
        response["personalized"] = get_user_based_recommendations(user_id, 12)
        
    return jsonify(response)

@app.route('/api/recommend/popularity', methods=['GET'])
def recommend_popularity():
    limit = int(request.args.get('limit', 10))
    books = list(db.books.find({}).sort("popularityScore", -1).limit(limit))
    for book in books:
        book['_id'] = str(book['_id'])
    return jsonify(books)

if __name__ == '__main__':
    app.run(port=5000, debug=True)

