CREATE TABLE IF NOT EXISTS Users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(100) NOT NULL,
  balance INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Watchlist (
    user_id INT NOT NULL,
    symbol VARCHAR(5) NOT NULL,
    CONSTRAINT Users
        FOREIGN KEY (user_id)
        REFERENCES Users (id)
        ON DELETE CASCADE
);

