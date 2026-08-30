import numpy as np
import pandas as pd
from bson import ObjectId

class ALSRecommender:
    def __init__(self, n_factors=20, regularization=0.1, n_iterations=15):
        self.n_factors = n_factors
        self.regularization = regularization
        self.n_iterations = n_iterations
        self.user_factors = None
        self.item_factors = None
        self.user_map = {}
        self.item_map = {}
        self.reverse_item_map = {}
        self.user_item_matrix = None

    def fit(self, ratings_df):
        """
        ratings_df: DataFrame with columns ['userId', 'bookId', 'value']
        """
        if ratings_df.empty:
            return

        unique_users = ratings_df['userId'].unique()
        unique_items = ratings_df['bookId'].unique()

        self.user_map = {uid: idx for idx, uid in enumerate(unique_users)}
        self.item_map = {iid: idx for idx, iid in enumerate(unique_items)}
        self.reverse_item_map = {idx: iid for iid, idx in self.item_map.items()}

        n_users = len(unique_users)
        n_items = len(unique_items)

        R = np.zeros((n_users, n_items))
        for _, row in ratings_df.iterrows():
            u_idx = self.user_map[row['userId']]
            i_idx = self.item_map[row['bookId']]
            R[u_idx, i_idx] = row['value']

        self.user_item_matrix = R

        # Initialize factors with small random values
        np.random.seed(42)
        self.user_factors = np.random.normal(0, 0.1, (n_users, self.n_factors))
        self.item_factors = np.random.normal(0, 0.1, (n_items, self.n_factors))

        I = np.eye(self.n_factors)

        # Alternating Least Squares iterations
        for _ in range(self.n_iterations):
            # Update user factors: U_u = (V^T V + lambda * I)^(-1) V^T R_u
            VtV = self.item_factors.T @ self.item_factors
            for u in range(n_users):
                self.user_factors[u] = np.linalg.solve(
                    VtV + self.regularization * I,
                    self.item_factors.T @ R[u, :]
                )

            # Update item factors: V_i = (U^T U + lambda * I)^(-1) U^T R_i
            UtU = self.user_factors.T @ self.user_factors
            for i in range(n_items):
                self.item_factors[i] = np.linalg.solve(
                    UtU + self.regularization * I,
                    self.user_factors.T @ R[:, i]
                )

    def recommend(self, user_id, top_n=10):
        if user_id not in self.user_map or self.user_factors is None:
            return []

        u_idx = self.user_map[user_id]
        user_vector = self.user_factors[u_idx]
        
        # Predicted ratings for all items: U_u * V^T
        scores = user_vector @ self.item_factors.T

        # Mask items already rated by this user
        rated_items_indices = np.where(self.user_item_matrix[u_idx] > 0)[0]
        scores[rated_items_indices] = -np.inf

        # Get top_n item indices
        top_indices = np.argsort(scores)[::-1][:top_n]
        
        recommended_book_ids = []
        for idx in top_indices:
            if scores[idx] != -np.inf:
                recommended_book_ids.append(self.reverse_item_map[idx])

        return recommended_book_ids
