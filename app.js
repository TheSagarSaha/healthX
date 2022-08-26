const express = require('express')
const mongoose = require("mongoose")
const bodyParser = require('body-parser');
const app = express()
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(passport.initialize())
app.use(passport.session())
mongoose.connect("mongodb://localhost:27017/ProjectX", { useNewUrlParser: true })

const dataSchema = new mongoose.Schema ({
  firstName: String,
  lastName: String,
  email: String,
  username: String,
  password: String,
})

const profileSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  username: String,
  phoneNumber: String,
  address: String,
  age: String,
  height: String,
  weight: String,
  cardInfo: String,
  hospital: String,
  lastVisited: String,
  upcoming: String
})

dataSchema.plugin(passportLocalMongoose)
const userData = new mongoose.model("data", dataSchema)
const profileData = new mongoose.model("profileData", profileSchema)

passport.use(userData.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  userData.findById(id, function(err, user) {
    done(err, user);
  });
});

app.get('/', (req, res) => {
  res.render("index")
})

app.get('/portal', (req, res) => {
  res.render("portal", {
    error: error
  })
})

app.get("/profile", (req, res) => {
  error = "none"

  if (req.isAuthenticated()) {

    

      res.render("profile", {
        profileData: showData,

      })

    
  } else {
    res.redirect("/error401")
  }
})


app.get('/editProfile', (req, res) => {
  if (req.isAuthenticated()) {
    res.render("editProfile", {
      profileDetail: showData
    })
  } else {
    res.redirect('/error401')
  }
})

app.get("/signOut", (req, res) => {
  showData = []
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/portal');
  });
})


app.get("/error401", (req, res) => {
  res.render("error401")
})


app.post("/signUp", (req, res) => {

  userData.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/portal")
    }
    else {
      const element = { 
        fullName: req.body.firstName + " " + req.body.lastName,
        email: req.body.email,
        username: req.body.username,
        phoneNumber: "N/A",
        address: req.body.address + ", " + req.body.country + ", " + req.body.zip,
        age: "N/A",
        height: "N/A",
        weight: "N/A",
        cardInfo: "N/A",
        hospital: "N/A",
        lastVisited: "N/A",
        upcoming: "N/A"
      }

      const newProfileData = new profileData(element)
      newProfileData.save()
      showData[0] = element
    
      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile") 
      })
    
    }
  }) 

})

app.post("/signIn", (req, res) => {
  const user = new userData({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, function (err) {
    if (err) { console.log(err); } else {
      passport.authenticate("local")(req, res, function (err) {
        profileData.find({ username: req.body.username }, function (err, results) {
          showData[0] = results[0]
          res.redirect('/profile')  
        })
      })
    }    
  })

})   


app.listen(3000, () => {
  console.log("3000");
})

