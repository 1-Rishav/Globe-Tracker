import express from "express";
import bodyParser from "body-parser";
import pg from "pg";


const app = express();
const port = process.env.PORT ||3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "123456",
  port: 4000,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [];

async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;",[currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
async function getCurrentUser(){
  const result = await db.query("SELECT * FROM users");
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
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    ); 
    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
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
    res.render("index.ejs",{countries:countries,total:countries.length,users: users,
    color: currentUser.color,error:'Country has already been added , try again.',})
  }
});
app.post("/user", async (req, res) => {
  if(req.body.add ==='new'){
    res.render('new.ejs');
  }else if(currentUserId=req.body.remove){
    try {
      await db.query("Delete from visited_countries where user_id=$1;",[currentUserId]);
   res.redirect("/");
    } catch (error) {
      console.log(error);
    }
  }else{
    currentUserId=req.body.user;
    res.redirect("/"); 
  }
  

  /* 
    res.render("index.ejs",{countries:countries,total:countries.length,users: users,
      color: currentUser.color,error:'Country has already been added , try again.',})
  } */
  });

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const name = req.body.name;
  const color=req.body.color;

  const result = await db.query("INSERT INTO USERS (name , color) VALUES($1 , $2) RETURNING *;",[name , color]);
  const id= result.rows[0].id;
  currentUserId = id;
  res.redirect('/');
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

