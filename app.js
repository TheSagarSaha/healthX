const express = require('express')
const mongoose = require("mongoose")
const bodyParser = require('body-parser');
const app = express()
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
var error = "none", showData = []

//  Set Up
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
app.use(methodOverride('_method'));
mongoose.connect("mongodb+srv://admin-sagar-saha:thesagarsaha@cluster0.3vqhx.mongodb.net/healthX", {useNewUrlParser: true})
const conn = mongoose.createConnection("mongodb+srv://admin-sagar-saha:thesagarsaha@cluster0.3vqhx.mongodb.net/healthX");

let gfs, gridfsBucket
conn.once('open', () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'fileData'
  });

  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('fileData');
})

// Multer Storage
const storage = new GridFsStorage({
  url: "mongodb://localhost:27017/healthX",
  file: (req, file) => {

    return new Promise((resolve, reject) => {
      const fileInfo = {
        filename: file.originalname,
        metadata: showData[0].username,
        bucketName: 'fileData'
      };
      resolve(fileInfo);
    });
  }
});
const upload = multer({ storage });

// MongoDB Schemas
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

// Passport Js Set Up
passport.use(userData.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  userData.findById(id, function(err, user) {
    done(err, user);
  });
});


// Get Requests
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

    gfs.files.find({metadata: showData[0].username}).toArray(((err, files) => {
      res.render("profile", {
        profileData: showData,
        files: files
      })
    }))
    
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

app.get("/files/:filename", (req, res) => {

  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {

    // Check if file
    if (!file || file.length === 0) {
      res.send("Fatal Error: No files Found")
    }

    const readStream = gridfsBucket.openDownloadStream(file._id);
    readStream.pipe(res);

  });
})

app.get("/error401", (req, res) => {
  res.render("error401")
})

app.get("/:query", (req, res) => {
  res.render("error404")
})

 
// Post Requests
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

app.post('/editProfile', (req, res) => {
  var element = {
    fullName: req.body.fullName,
    email: req.body.email,
    username: showData[0].username,
    phoneNumber: req.body.num,
    address: req.body.address,
    age: req.body.age,
    height: req.body.height,
    weight: req.body.weight,
    cardInfo: req.body.cardInfo,
    hospital: req.body.nearestHospital,
    lastVisited: req.body.lastVisited,
    upcoming: req.body.upcoming
  }

  profileData.replaceOne({ username: showData[0].username }, element, function (err, res) {
    if (err) {
      console.log(err);
    }
  })
  showData[0] = element
  res.redirect("/profile")

})

app.post('/upload', upload.single('uploadedFile'), (req, res) => {
  console.log(req.file);
  res.redirect('/profile')
});

app.post('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id }, function (err) {
    if (err) return handleError(err);
    console.log('success');
    res.redirect("/profile")
  });
});


// Start App
app.listen(3000, () => {
  console.log("3000");
})
