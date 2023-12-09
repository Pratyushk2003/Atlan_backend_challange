-- Table to store client income data
CREATE TABLE client_income_data (
   client_id SERIAL PRIMARY KEY,
   client_email VARCHAR(255),
   client_name VARCHAR(255),
   income_per_annum INT,
   savings_per_annum INT,
   mobile_number VARCHAR(10)
);
-- Table to store word mappings to languages
CREATE TABLE wordlang (
  word_ID SERIAL PRIMARY KEY,
  word VARCHAR(255) UNIQUE,
  lang VARCHAR(2)
);

-- Table to store word mappings to slangs
CREATE TABLE wordslang (
  lang_ID VARCHAR(2),
  word VARCHAR(255),
  slang VARCHAR(255),
  PRIMARY KEY (lang_ID, word),
  FOREIGN KEY (word) REFERENCES wordlang(word)
);

INSERT INTO wordlang (word, lang) VALUES
    ('Hello', 'HI');

INSERT INTO wordslang (lang_ID, word, slang) VALUES
    ('HI', 'Hello', 'Namaste');

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);
