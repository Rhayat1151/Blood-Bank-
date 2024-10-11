import express from "express";
import bodyParser from "body-parser";
import session from "express-session";  
import pg from "pg";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
  secret: 'yourSecretKey', // Replace with a strong secret key
  resave: false,
  saveUninitialized: true
}));

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Blood-Bank",  // Ensure this database exists
  password: "m1.r2.h3.",   // Use your actual database password
  port: 5432,
});

db.connect();

// Removed the authentication middleware

// Homepage route - Now accessible without authentication
const credentials = {
  username: "admin",
  password: "password123"
};

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

// Login route
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === credentials.username && password === credentials.password) {
    req.session.user = username;
    res.redirect("/");
  } else {
    res.status(401).send("Invalid credentials");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send("Error logging out");
    }
    res.redirect("/login");
  });
});

// Homepage route - Now requires authentication
app.get("/", isAuthenticated, (req, res) => {
  res.render("index");
});app.get("/", (req, res) => {
  res.render("index");  // Renders the homepage directly
});

// Route to view blood group details (e.g., A+ group)
app.get("/blood/:group", async (req, res) => {
  const group = req.params.group;
  const tableName = getTableName(group);  // Helper function to get table name
  try {
    const result = await db.query(`SELECT * FROM ${tableName}`);
    res.render(`bloodGroups/${group}.ejs`, { donors: result.rows });
  } catch (err) {
    res.status(500).send("Error fetching blood group data");
  }
});

// Helper function to map blood groups to table names
const getTableName = (group) => {
  const tableMapping = {
    "Apos": "Apos",
    "Aneg": "Aneg",
    "Bpos": "Bpos",
    "Bneg": "Bneg",
    "Opos": "Opos",
    "Oneg": "Oneg",
    "ABpos": "ABpos",
    "ABneg": "ABneg"
  };
  return tableMapping[group];
};

// Route to add new record
app.get("/add", (req, res) => {
  res.render("addRecord");
});

app.post("/add", async (req, res) => {
  const { name, contact, email, age, last_donated, blood_group } = req.body;
  const tableName = getTableName(blood_group);
  try {
    await db.query(`INSERT INTO ${tableName} (name, contact, email, age, last_donated) VALUES ($1, $2, $3, $4, $5)`,
      [name, contact, email, age, last_donated]);
    res.redirect(`/blood/${blood_group}`);
  } catch (err) {
    res.status(500).send("Error adding record");
  }
});

// Route to edit record
app.get("/edit/:group/:id", async (req, res) => {
  const { group, id } = req.params;
  const tableName = getTableName(group);
  try {
    const result = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
    res.render("editRecord", { donor: result.rows[0], group });
  } catch (err) {
    res.status(500).send("Error fetching record");
  }
});

// app.post("/edit/:group/:id", async (req, res) => {
//   const { name, contact, email, age, last_donated } = req.body;
//   const { group, id } = req.params;
//   const tableName = getTableName(group);
//   try {
//     await db.query(`UPDATE ${tableName} SET name = $1, contact = $2, email = $3, age = $4, last_donated = $5 WHERE id = $6`,
//       [name, contact, email, age, last_donated, id]);
//     res.redirect(`/blood/${group}`);
//   } catch (err) {
//     res.status(500).send("Error updating record");
//   }
// });
app.post("/edit/:group/:id", async (req, res) => {
  const { name, contact, email, age, last_donated } = req.body;
  const { group, id } = req.params;

  // Validate input data
  if (!name || !contact || !email || !age || !last_donated) {
    return res.status(400).send("Please provide all required fields");
  }

  if (isNaN(id) || id <= 0) {
    return res.status(400).send("Invalid ID");
  }

  const tableName = getTableName(group);
  if (!tableName) {
    return res.status(404).send("Invalid group");
  }

  try {
    const query = `UPDATE ${tableName} SET name = $1, contact = $2, email = $3, age = $4, last_donated = $5 WHERE id = $6`;
    const params = [name, contact, email, age, last_donated, id];

    console.log(`Executing query: ${query} with params: ${JSON.stringify(params)}`);

    await db.query(query, params);
    res.redirect(`/blood/${group}?updated=true`);
  } catch (err) {
    console.error(`Error updating record: ${err.message}`);
    res.status(500).send("Error updating record");
  }
});


// Route to delete record
app.post("/delete/:group/:id", async (req, res) => {
  const { group, id } = req.params;
  const tableName = getTableName(group);
  try {
    await db.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
    res.redirect(`/blood/${group}`);
  } catch (err) {
    res.status(500).send("Error deleting record");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
