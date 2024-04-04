CREATE TABLE IF NOT EXISTS Users (
  id INT SERIAL KEY,
  username VARCHAR(100) NOT NULL,
  balance INT NOT NULL,
  password VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Stocks (
  symbol VARCHAR(4) PRIMARY KEY,
  search_keyWord VARCHAR(100) NOT NULL,
);

CREATE TABLE IF NOT EXISTS Watchlist (
    user_id INT NOT NULL,
    symbol VARCHAR(4) NOT NULL,
    CONSTRAINT Users
        FOREIGN KEY (user_id)
        REFERENCES Users (id)
        ON DELETE CASCADE
    CONSTRAINT Stocks
        FOREIGN KEY (symbol)
        REFERENCES Stocks (symbol)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Held_Stocks (
    user_id INT NOT NULL,
    symbol VARCHAR(4) NOT NULL,
    quantity INT NOT NULL,
    CONSTRAINT Users
        FOREIGN KEY (user_id)
        REFERENCES Users (id)
        ON DELETE CASCADE
    CONSTRAINT Stocks
        FOREIGN KEY (symbol)
        REFERENCES Stocks (symbol)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Transactions (
    user_id INT NOT NULL,
    symbol VARCHAR(4) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL NOT NULL,
    date DATE NOT NULL,
    CONSTRAINT Users
        FOREIGN KEY (user_id)
        REFERENCES Users (id)
        ON DELETE CASCADE
    CONSTRAINT Stocks
        FOREIGN KEY (symbol)
        REFERENCES Stocks (symbol)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Customizations (
    user_id INT NOT NULL,
    theme VARCHAR(100) NOT NULL,
    value VARCHAR(100) NOT NULL,
    CONSTRAINT Users
        FOREIGN KEY (user_id)
        REFERENCES Users (id)
        ON DELETE CASCADE
);