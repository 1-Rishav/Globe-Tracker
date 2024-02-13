import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const { Pool } = pg;
const app = express();
const port = process.env.PORT ||3000;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL ,
  user: process.env.POSTGRES_USER,
  host:process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD, 
})
pool.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [];

async function checkVisited() {
  const result = await pool.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;",[currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
async function getCurrentUser(){
  const result = await pool.query("SELECT * FROM users");
  users=result.rows;
  return users.find((user)=>user.id==currentUserId)
}
app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];
const currentUser = await getCurrentUser();
  try {
    const result = await pool.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    ); 
    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await pool.query(
        "INSERT INTO visited_countries (country_code , user_id) VALUES ($1 , $2);",
        [countryCode , currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
      const countries = await checkVisited();
      res.render("index.ejs",{countries:countries,total:countries.length,users: users,
        color: currentUser.color,error:'Country has already been added , try again.',})
    
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  if(req.body.add ==='new'){
    res.render('new.ejs');
  }else{
    currentUserId=req.body.user;
    res.redirect('/');
  }
  });

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const name = req.body.name;
  const color=req.body.color;

  const result = await pool.query("INSERT INTO USERS (name , color) VALUES($1 , $2) RETURNING *;",[name , color]);
  const id= result.rows[0].id;
  currentUserId = id;
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
